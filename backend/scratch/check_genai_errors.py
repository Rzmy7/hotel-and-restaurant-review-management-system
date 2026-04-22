from google.genai import errors
try:
    print(dir(errors))
    # print(errors.ClientError.__dict__)
except Exception as e:
    print(e)
