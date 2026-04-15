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
        await delete_cache(f"user_notifications:{user_id}")
        await delete_cache(f"announcements_by_uploader:{user_id}")
        await delete_cache(f"all_announcements") 
        await delete_cache(f"events_cache")
        await delete_cache(f"event_{user_id}")
    
    print(f"✅ Cleared user caches for users 1-100")
    
    # Clear barangay-specific caches
    barangay_ids = range(1, 21)  # Clear cache for barangays 1-20
    for barangay_id in barangay_ids:
        # Clear complaint caches
        await delete_cache(f"barangay_{barangay_id}_complaints")
        
        # Clear complaint stats
        await delete_cache(f"complaint_stats:weekly:{barangay_id}")
        for year in range(2024, 2027):  # Clear stats for 2024-2026
            await delete_cache(f"complaint_stats:yearly:{barangay_id}:{year}")
            for month in range(1, 13):
                await delete_cache(f"complaint_stats:monthly:{barangay_id}:{year}:{month}")
        
        # Clear incidents cache (correct key from services)
        await delete_cache(f"barangay_incidents:{barangay_id}")
        
        # Clear forwarded incidents cache (correct key from services)
        await delete_cache(f"forwarded_barangay_incidents:{barangay_id}")
        
        # Clear monthly report cache for the past 12 months
        for month in range(1, 13):
            for year in range(2024, 2027):  # Clear reports for 2024-2026
                await delete_cache(f"monthly_report_by_barangay:{barangay_id}:{month}:{year}")
    
    print(f"✅ Cleared barangay caches for barangays 1-20")
    
    # Clear incident-specific caches
    incident_ids = range(500, 1500)  # Clear cache for incidents 500-1499
    for incident_id in incident_ids:
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
    
    print(f"✅ Cleared incident caches for incidents 500-1499")
    
    # Clear complaint-specific caches
    complaint_ids = range(900, 2000)  # Clear cache for complaints 900-1999
    for complaint_id in complaint_ids:
        await delete_cache(f"complaint:{complaint_id}")
    
    print(f"✅ Cleared complaint caches for complaints 900-1999")
    
    # Clear global caches
    await delete_cache("all_complaints")
    await delete_cache("all_barangays")
    await delete_cache("all_forwarded_incidents")
    
    print(f"✅ Cleared global caches")
    
    print("\n✅ All cache entries cleared!")
    
    

if __name__ == "__main__":
    asyncio.run(clear_user_cache())
