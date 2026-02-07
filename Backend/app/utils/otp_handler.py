import random

def generate_otp(length=6):
    """Generates a random OTP of specified length."""
    otp = ''.join(random.choices('0123456789', k=length))
    return otp
    