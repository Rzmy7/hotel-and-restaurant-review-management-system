from fastapi import APIRouter , HTTPException

router = APIRouter()


#---- common API -----

@router.get("/")
def get_all_source_infos():
    try:
        return {"message": "Source API"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
