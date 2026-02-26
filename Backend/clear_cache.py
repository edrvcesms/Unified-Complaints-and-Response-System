import asyncio
from app.utils.caching import delete_cache, get_cache

async def clear_user_cache():
    """Clear all user-related cache entries"""
    user_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  # Clear cache for users 1-10
    
    for user_id in user_ids:
        # Clear user data cache
        await delete_cache(f"user_data:{user_id}")
        print(f"✅ Cleared cache: user_data:{user_id}")
        
        # Clear barangay profile cache
        await delete_cache(f"barangay_profile:{user_id}")
        print(f"✅ Cleared cache: barangay_profile:{user_id}")
        
        # Clear user complaints cache
        await delete_cache(f"user_complaints:{user_id}")
        print(f"✅ Cleared cache: user_complaints:{user_id}")
    
    # Clear barangay-specific complaint caches
    barangay_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    for barangay_id in barangay_ids:
        await delete_cache(f"barangay_{barangay_id}_complaints")
        print(f"✅ Cleared cache: barangay_{barangay_id}_complaints")
        
        # Clear weekly stats for each barangay
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        print(f"✅ Cleared cache: weekly_complaint_stats_by_barangay:{barangay_id}")
    
    # Clear global caches
    await delete_cache("all_complaints")
    print(f"✅ Cleared cache: all_complaints")
    
    await delete_cache("all_barangays")
    print(f"✅ Cleared cache: all_barangays")
    
    print("\n✅ All cache entries cleared!")

if __name__ == "__main__":
    asyncio.run(clear_user_cache())
