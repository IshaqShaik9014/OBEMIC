const fs = require('fs');
let content = fs.readFileSync('frontend/src/app/survey/[id]/page.tsx', 'utf8');

content = content.replace(/<div className="topbar-logo">\?\?<\/div>/g, '<div className="topbar-logo">??</div>');
content = content.replace(/<button className="btn btn-rose btn-sm" onClick=\{handleLogout\}>\?\? Logout<\/button>/g, '<button className="btn btn-rose btn-sm" onClick={handleLogout}>?? Logout</button>');
content = content.replace(/<div className="login-icon">\?\?<\/div>/g, '<div className="login-icon">??</div>');
content = content.replace(/\{isLoggingIn \? 'Authenticating\.\.\.' : '\?\? Enter Survey'\}/g, "{isLoggingIn ? 'Authenticating...' : '?? Enter Survey'}");
content = content.replace(/<div className="msg-ico lock">\?\?<\/div>/g, '<div className="msg-ico lock">??</div>');
content = content.replace(/<div className="msg-ico lock" style=\{\{ background: '#e7faf0', color: '#10b981' \}\}>\?<\/div>/g, '<div className="msg-ico lock" style={{ background: \\'#e7faf0\\', color: \\'#10b981\\' }}>?</div>');
content = content.replace(/<div className="tile-arrow">\?<\/div>/g, '<div className="tile-arrow">?</div>');
content = content.replace(/onClick=\{.. => setSelectedAssignmentId\(null\)\}>\? Back to Subjects<\/button>/g, 'onClick={() => setSelectedAssignmentId(null)}>? Back to Subjects</button>');
content = content.replace(/<div className="done-badge">\? Rated<\/div>/g, '<div className="done-badge">? Rated</div>');
content = content.replace(/\{isSubmitting \? 'Submitting\.\.\.' : '\? Submit Survey'\}/g, "{isSubmitting ? 'Submitting...' : '? Submit Survey'}");

fs.writeFileSync('frontend/src/app/survey/[id]/page.tsx', content, 'utf8');
