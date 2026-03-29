from pydantic import BaseModel, EmailStr, Field

class SignupModel(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)

class LoginModel(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)

class EmailModel(BaseModel):
    email: EmailStr

class ResetModel(BaseModel):
    new_password: str = Field(..., min_length=1, max_length=72)
