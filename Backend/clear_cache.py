import asyncio
from app.utils.caching import delete_cache, get_cache

async def clear_user_cache():
    """Clear all user-related cache entries"""
    user_ids = range(1, 101)  # Clear cache for users 1-100
    
    for user_id in user_ids:
        # Clear user data cache
        await delete_cache(f"user_data:{user_id}")
        
        # Clear user profile cache
        await delete_cache(f"user_profile:{user_id}")
        
        # Clear barangay profile cache
        await delete_cache(f"barangay_profile:{user_id}")
        
        # Clear user complaints cache
        await delete_cache(f"user_complaints:{user_id}")
    
    print(f"✅ Cleared user caches for users 1-100")
    
    # Clear barangay-specific caches
    barangay_ids = range(1, 21)  # Clear cache for barangays 1-20
    for barangay_id in barangay_ids:
        # Clear complaint caches
        await delete_cache(f"barangay_{barangay_id}_complaints")
        
        # Clear weekly stats
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        
        # Clear incidents cache (correct key from services)
        await delete_cache(f"barangay_incidents:{barangay_id}")
        
        # Clear forwarded incidents cache (correct key from services)
        await delete_cache(f"forwarded_barangay_incidents:{barangay_id}")
    
    print(f"✅ Cleared barangay caches for barangays 1-20")
    
    # Clear incident-specific caches
    incident_ids = range(1, 1001)  # Clear cache for incidents 1-1000
    for incident_id in incident_ids:
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
    
    print(f"✅ Cleared incident caches for incidents 1-1000")
    
    # Clear complaint-specific caches
    complaint_ids = range(1, 1001)  # Clear cache for complaints 1-1000
    for complaint_id in complaint_ids:
        await delete_cache(f"complaint:{complaint_id}")
    
    print(f"✅ Cleared complaint caches for complaints 1-1000")
    
    # Clear global caches
    await delete_cache("all_complaints")
    await delete_cache("all_barangays")
    await delete_cache("all_forwarded_incidents")
    
    print(f"✅ Cleared global caches")
    
    print("\n✅ All cache entries cleared!")

if __name__ == "__main__":
    asyncio.run(clear_user_cache())
