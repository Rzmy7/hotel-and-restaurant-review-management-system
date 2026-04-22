import requests
import sys

from dotenv import load_dotenv
load_dotenv('.env')

# Login to get token
login_data = {
    'email': 'hansiashara2@gmail.com', # The Google login email
    'password': 'Password123!' # or use whatever
}

resp_login = requests.post('http://127.0.0.1:8000/api/login', json={'email': 'admin@example.com', 'password': 'admin'})
if resp_login.status_code != 200:
    print("Login failed, falling back to db token gen")
    
    sys.path.append('.')
    from app.core.security import create_access_token
    from app.core.database import SessionLocal
    from sqlalchemy import text
    
    db = SessionLocal()
    # Just grab any user_id
    user = db.execute(text("SELECT TOP 1 user_id FROM dbo.users")).fetchone()
    if not user:
        print("No users at all")
        sys.exit(1)
        
    token = create_access_token(user_id=str(user[0]), role='TENANT')
else:
    token = resp_login.json().get('access_token')

print("Got token")
url = 'http://127.0.0.1:8000/api/organizations'
resp_org = requests.post(url, json={'organization_name': 'marriot_test', 'organization_type': 'hotel'}, headers={'Authorization': 'Bearer ' + token})

print("ORG STATUS:", resp_org.status_code)
print("ORG RESPONSE:", resp_org.text)
