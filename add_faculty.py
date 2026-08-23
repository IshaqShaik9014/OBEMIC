import sys

with open('frontend/src/app/admin/faculty/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
import re
state_insert = '''  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFaculty, setNewFaculty] = useState({ employeeId: '', name: '', email: '', departmentId: '' });
  const [isCreating, setIsCreating] = useState(false);
'''
content = content.replace('  const [isUnassigning, setIsUnassigning] = useState(false);', '  const [isUnassigning, setIsUnassigning] = useState(false);\n\n' + state_insert)

# Add create handler
handler_insert = '''  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await adminService.createFaculty(newFaculty);
      alert('Faculty created successfully');
      setShowCreateModal(false);
      setNewFaculty({ employeeId: '', name: '', email: '', departmentId: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create faculty');
    } finally {
      setIsCreating(false);
    }
  };
'''
content = content.replace('  const fetchData = async () => {', handler_insert + '\n  const fetchData = async () => {')

# Add button
btn_target = '''<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', margin: 0 }}>Faculty Management</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Assign subjects and manage faculty access</p>
        </div>'''
btn_replace = '''<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', margin: 0 }}>Faculty Management</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Assign subjects and manage faculty access</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Add Faculty Manually</Button>'''
content = content.replace(btn_target, btn_replace)

# Add modal at the end of the file
modal_ui = '''
      {/* Create Faculty Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid #334155' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>Create Faculty Manually</h2>
            <form onSubmit={handleCreateFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Employee ID (Required)</label>
                <input required value={newFaculty.employeeId} onChange={e => setNewFaculty({...newFaculty, employeeId: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Name (Required)</label>
                <input required value={newFaculty.name} onChange={e => setNewFaculty({...newFaculty, name: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Email (Required)</label>
                <input required type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Department ID (Required)</label>
                <input required value={newFaculty.departmentId} onChange={e => setNewFaculty({...newFaculty, departmentId: e.target.value})} placeholder="e.g. MECH" style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: '1px solid #334155' }}>Cancel</Button>
                <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Faculty'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
'''
content = content.replace('    </div>\n  );\n}', modal_ui)

with open('frontend/src/app/admin/faculty/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done faculty page')
