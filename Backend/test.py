from app.utils.caching import get_cache, set_cache

async def test_cache():
  await set_cache("otp_test", {"otp": 1234}, expiration=60)
  cached = await get_cache("otp_test")
  print("Cached OTP:", cached)
  
if __name__ == "__main__":
    import asyncio
    asyncio.run(test_cache())