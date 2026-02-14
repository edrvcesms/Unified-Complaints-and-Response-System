import time
from app.tasks import send_otp_email

start = time.time()
send_otp_email.delay("test@example.com", "123456", purpose="Test")
print("Elapsed:", time.time() - start)
