from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupModel(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Full name is required.")
        return value


class LoginModel(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)


class LoginTwoFactorModel(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class EmailModel(BaseModel):
    email: EmailStr


class ResetModel(BaseModel):
    new_password: str = Field(..., min_length=1, max_length=72)
