from fastapi.responses import JSONResponse

async def set_cookies(response: JSONResponse, refresh_token: str, key: str = "refresh_token"):
    response.set_cookie(
        key=key,
        value=refresh_token,
        httponly=True,
        secure=False, # will be changed after deployment
        samesite="Lax", # will be changed after deployment
        expires=7 * 24 * 60 * 60 # 7 days in seconds
    )

async def clear_cookies(response: JSONResponse, key: str = "refresh_token"):
    response.delete_cookie(key=key)