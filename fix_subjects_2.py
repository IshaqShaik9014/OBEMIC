import sys

with open('frontend/src/app/admin/subjects/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the start of the table, and replace the broken end part.
target = '''                  <td style={{ padding: '12px', textAlign: 'right' }}>'''

# It should just have the Button, then end the td, tr, tbody, table, Card, div, etc.

content = content.split(\"<td style={{ padding: '12px', textAlign: 'right' }}>\")[0]

rest = '''                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <Button style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => alert('Edit subject coming soon!')}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
'''
with open('frontend/src/app/admin/subjects/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content + rest)

print('Done')
