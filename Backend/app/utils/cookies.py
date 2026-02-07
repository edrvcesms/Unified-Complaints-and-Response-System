from fastapi.responses import JSONResponse

async def set_cookies(response: JSONResponse, refresh_token: str):
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False, # will be changed after deployment
        samesite="Lax", # will be changed after deployment
        expires=7 * 24 * 60 * 60 # 7 days in seconds
    )

async def clear_cookies(response: JSONResponse):
    response.delete_cookie(key="refresh_token")