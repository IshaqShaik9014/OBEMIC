import * as fs from 'fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mimeType?: string;
  fileId?: string;
  children?: FileTreeNode[];
}

export class ScriptStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve('storage/scripts');
  }

  /**
   * Resolves common MIME types for scripts, scans, and documents
   */
  public getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.pdf': return 'application/pdf';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.webp': return 'image/webp';
      case '.tif':
      case '.tiff': return 'image/tiff';
      case '.bmp': return 'image/bmp';
      case '.gif': return 'image/gif';
      case '.doc': return 'application/msword';
      case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.csv': return 'text/csv';
      case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.xls': return 'application/vnd.ms-excel';
      case '.txt': return 'text/plain';
      default: return 'application/octet-stream';
    }
  }

  /**
   * Sanitizes relative paths to prevent directory traversal attacks (e.g. ../../)
   */
  public sanitizeRelativePath(rawPath: string): string {
    const normalized = path.normalize(rawPath).replace(/^[\\\/]+/, '');
    const cleanPath = normalized.replace(/^(\.\.[\\\/])+/, '');
    return cleanPath.replace(/\\/g, '/');
  }

  /**
   * Generates the root directory for a script bundle
   */
  public getBundleDirectory(bundleId: string): string {
    return path.join(this.baseDir, bundleId);
  }

  /**
   * Saves an uploaded file into the bundle directory preserving its relative path.
   * Includes graceful fallback for Windows locks / EXDEV cross-device moves.
   */
  public async saveFileToBundle(
    bundleId: string,
    tempFilePath: string,
    relativePath: string
  ): Promise<string> {
    const cleanRelative = this.sanitizeRelativePath(relativePath);
    const bundleDir = this.getBundleDirectory(bundleId);
    const destinationPath = path.join(bundleDir, cleanRelative);

    // Ensure target subdirectories exist (ignoring EEXIST race conditions on Windows)
    try {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    } catch (mkdirErr: any) {
      if (mkdirErr.code !== 'EEXIST') throw mkdirErr;
    }

    try {
      await fs.rename(tempFilePath, destinationPath);
    } catch (err: any) {
      // Fallback for Windows file locks or EXDEV
      await fs.copyFile(tempFilePath, destinationPath);
      await fs.unlink(tempFilePath).catch(() => {});
    }

    return destinationPath;
  }

  /**
   * Extracts a ZIP archive directly into the bundle directory and returns all extracted file entries
   */
  public async extractZipArchive(
    bundleId: string,
    tempZipPath: string
  ): Promise<{ fileName: string; relativePath: string; fileSize: number; mimeType: string; storagePath: string }[]> {
    const bundleDir = this.getBundleDirectory(bundleId);
    await fs.mkdir(bundleDir, { recursive: true });

    // Use native AdmZip for cross-platform, synchronous reliability without shell spawning
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(bundleDir, true);

    const zipEntries = zip.getEntries();
    const extractedFiles: { fileName: string; relativePath: string; fileSize: number; mimeType: string; storagePath: string }[] = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const rawPath = entry.entryName.replace(/\\/g, '/');
      const lowerName = rawPath.toLowerCase();

      // Skip OS junk files, mac metadata, and zip internal caches
      if (
        lowerName.includes('ds_store') ||
        lowerName.includes('thumbs.db') ||
        lowerName.endsWith('.ini') ||
        lowerName.includes('__macosx') ||
        path.basename(rawPath).startsWith('._')
      ) {
        continue;
      }

      const cleanRelative = this.sanitizeRelativePath(rawPath);
      const fullPath = path.join(bundleDir, cleanRelative);

      extractedFiles.push({
        fileName: path.basename(cleanRelative),
        relativePath: cleanRelative,
        fileSize: entry.header.size,
        mimeType: this.getMimeType(cleanRelative),
        storagePath: fullPath
      });
    }

    // Remove the temporary uploaded zip file
    await fs.unlink(tempZipPath).catch(() => {});

    return extractedFiles;
  }

  /**
   * Reads a file buffer for download/streaming
   */
  public async getFileStream(absolutePath: string): Promise<Buffer> {
    return fs.readFile(absolutePath);
  }

  /**
   * Deletes a bundle directory and all its contents
   */
  public async deleteBundleDirectory(bundleId: string): Promise<void> {
    const bundleDir = this.getBundleDirectory(bundleId);
    try {
      await fs.rm(bundleDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Error deleting bundle directory:', e);
    }
  }

  /**
   * Builds an interactive nested directory tree structure from file records
   */
  public buildFileTree(files: { id: string; fileName: string; relativePath: string; fileSize: number; mimeType: string }[]): FileTreeNode[] {
    const root: FileTreeNode = {
      name: 'root',
      path: '',
      isDirectory: true,
      children: []
    };

    for (const file of files) {
      const parts = this.sanitizeRelativePath(file.relativePath).split(/[\\\/]/);
      let currentLevel = root.children!;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        let existingNode = currentLevel.find((n) => n.name === part);

        if (!existingNode) {
          const newNode: FileTreeNode = {
            name: part,
            path: currentPath,
            isDirectory: !isFile,
            ...(isFile
              ? {
                  size: file.fileSize,
                  mimeType: file.mimeType,
                  fileId: file.id
                }
              : {
                  children: []
                })
          };
          currentLevel.push(newNode);
          if (!isFile) {
            currentLevel = newNode.children!;
          }
        } else if (!isFile) {
          if (!existingNode.children) existingNode.children = [];
          currentLevel = existingNode.children;
        }
      }
    }

    return root.children || [];
  }
}
