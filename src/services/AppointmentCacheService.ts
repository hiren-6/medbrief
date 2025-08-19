import { AppointmentStatusService } from './AppointmentStatusService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class AppointmentCacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static defaultTTL = 5 * 60 * 1000; // 5 minutes
  private static maxCacheSize = 1000; // Maximum number of cache entries

  /**
   * Get appointments for a doctor with caching
   */
  static async getDoctorAppointments(doctorId: string, date?: Date): Promise<any[]> {
    const cacheKey = `doctor_appointments_${doctorId}_${date ? date.toISOString().split('T')[0] : 'all'}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    console.log(`Cache miss for ${cacheKey}, fetching from database`);
    const data = await AppointmentStatusService.getDoctorAppointments(doctorId, date);
    
    this.setCacheEntry(cacheKey, data, this.defaultTTL);
    return data;
  }

  /**
   * Get appointments for a patient with caching
   */
  static async getPatientAppointments(patientId: string): Promise<any[]> {
    const cacheKey = `patient_appointments_${patientId}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    console.log(`Cache miss for ${cacheKey}, fetching from database`);
    const data = await AppointmentStatusService.getPatientAppointments(patientId);
    
    this.setCacheEntry(cacheKey, data, this.defaultTTL);
    return data;
  }

  /**
   * Get appointment status summary with caching
   */
  static async getAppointmentStatusSummary(appointmentId: string): Promise<any> {
    const cacheKey = `appointment_summary_${appointmentId}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    console.log(`Cache miss for ${cacheKey}, fetching from database`);
    const data = await AppointmentStatusService.getAppointmentStatusSummary(appointmentId);
    
    this.setCacheEntry(cacheKey, data, this.defaultTTL);
    return data;
  }

  /**
   * Get status history with caching
   */
  static async getStatusHistory(appointmentId: string): Promise<any[]> {
    const cacheKey = `status_history_${appointmentId}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    console.log(`Cache miss for ${cacheKey}, fetching from database`);
    const data = await AppointmentStatusService.getStatusHistory(appointmentId);
    
    this.setCacheEntry(cacheKey, data, this.defaultTTL);
    return data;
  }

  /**
   * Get doctor appointment statistics with caching
   */
  static async getDoctorAppointmentStats(doctorId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    const cacheKey = `doctor_stats_${doctorId}_${dateRange ? `${dateRange.start.toISOString()}_${dateRange.end.toISOString()}` : 'all'}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    console.log(`Cache miss for ${cacheKey}, fetching from database`);
    const data = await AppointmentStatusService.getDoctorAppointmentStats(doctorId, dateRange);
    
    this.setCacheEntry(cacheKey, data, this.defaultTTL);
    return data;
  }

  /**
   * Set cache entry with size management
   */
  private static setCacheEntry(key: string, data: any, ttl: number): void {
    // Remove expired entries first
    this.cleanupExpiredEntries();

    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntries();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    console.log(`Cached ${key}, cache size: ${this.cache.size}`);
  }

  /**
   * Invalidate cache for a specific doctor
   */
  static invalidateDoctorCache(doctorId: string, date?: Date): void {
    const patterns = [
      `doctor_appointments_${doctorId}_${date ? date.toISOString().split('T')[0] : 'all'}`,
      `doctor_appointments_${doctorId}_`,
      `doctor_stats_${doctorId}_`
    ];

    for (const pattern of patterns) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
          console.log(`Invalidated cache entry: ${key}`);
        }
      }
    }
  }

  /**
   * Invalidate cache for a specific patient
   */
  static invalidatePatientCache(patientId: string): void {
    const patterns = [
      `patient_appointments_${patientId}`,
      `appointment_summary_`,
      `status_history_`
    ];

    for (const pattern of patterns) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
          console.log(`Invalidated cache entry: ${key}`);
        }
      }
    }
  }

  /**
   * Invalidate cache for a specific appointment
   */
  static invalidateAppointmentCache(appointmentId: string): void {
    const patterns = [
      `appointment_summary_${appointmentId}`,
      `status_history_${appointmentId}`
    ];

    for (const pattern of patterns) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
          console.log(`Invalidated cache entry: ${key}`);
        }
      }
    }
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): any {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Clean up expired cache entries
   */
  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict oldest cache entries when cache is full
   */
  private static evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const entriesToRemove = Math.floor(this.maxCacheSize * 0.2); // Remove 20% of oldest entries
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
} 