import urllib.request
import json
import sys

sys.path.append('.')

from app.core.security import create_access_token
from app.database.session import SessionLocal
from app.modules.auth.models import User

db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No users in db")
    sys.exit(1)

token = create_access_token(user_id=str(user.user_id), role='ADMIN')

url = 'http://127.0.0.1:8000/api/organizations'
data = json.dumps({'organization_name': 'marriot_test', 'organization_type': 'hotel'}).encode('utf-8')
headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
}

req = urllib.request.Request(url, data=data, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        print('STATUS:', response.status)
        print('RESPONSE:', response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('STATUS:', e.code)
    print('RESPONSE:', e.read().decode('utf-8'))
