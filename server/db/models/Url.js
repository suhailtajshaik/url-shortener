const { getSupabase } = require("../supabase");

class UrlModel {
  /**
   * Create a new shortened URL
   */
  static async create(data) {
    const supabase = getSupabase();
    
    const { data: url, error } = await supabase
      .from("urls")
      .insert({
        url_code: data.urlCode,
        long_url: data.longUrl,
        short_url: data.shortUrl,
        is_custom: data.isCustom || false,
        expires_at: data.expiresAt || null,
        created_at: data.date || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return this._formatUrl(url);
  }

  /**
   * Find a URL by urlCode
   */
  static async findOne(query) {
    const supabase = getSupabase();
    
    let supabaseQuery = supabase.from("urls").select("*");

    if (query.urlCode) {
      supabaseQuery = supabaseQuery.eq("url_code", query.urlCode);
    } else if (query.longUrl) {
      supabaseQuery = supabaseQuery.eq("long_url", query.longUrl);
    }

    const { data, error } = await supabaseQuery.single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data ? this._formatUrl(data) : null;
  }

  /**
   * Find a URL by ID
   */
  static async findById(id) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from("urls")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data ? this._formatUrl(data) : null;
  }

  /**
   * Update a URL
   */
  static async update(urlCode, updates) {
    const supabase = getSupabase();
    
    const updateData = {};
    if (updates.longUrl) updateData.long_url = updates.longUrl;
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt;
    if (updates.clicks !== undefined) updateData.clicks = updates.clicks;
    if (updates.lastClickedAt !== undefined) updateData.last_clicked_at = updates.lastClickedAt;

    const { data, error } = await supabase
      .from("urls")
      .update(updateData)
      .eq("url_code", urlCode)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return this._formatUrl(data);
  }

  /**
   * Delete a URL
   */
  static async delete(urlCode) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from("urls")
      .delete()
      .eq("url_code", urlCode)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data ? this._formatUrl(data) : null;
  }

  /**
   * Record a click with analytics data
   */
  static async recordClick(urlCode, clickData) {
    const supabase = getSupabase();
    
    // First, get the URL ID
    const url = await this.findOne({ urlCode });
    if (!url) {
      throw new Error("URL not found");
    }

    // Limit click details to last 100 by deleting old ones
    const { data: existingClicks } = await supabase
      .from("click_details")
      .select("id")
      .eq("url_id", url.id)
      .order("timestamp", { ascending: true });

    if (existingClicks && existingClicks.length >= 100) {
      const toDelete = existingClicks.slice(0, existingClicks.length - 99);
      const idsToDelete = toDelete.map((c) => c.id);
      
      await supabase
        .from("click_details")
        .delete()
        .in("id", idsToDelete);
    }

    // Insert click detail
    const { error } = await supabase
      .from("click_details")
      .insert({
        url_id: url.id,
        timestamp: clickData.timestamp || new Date().toISOString(),
        user_agent: clickData.userAgent,
        referer: clickData.referer,
        ip: clickData.ip,
        latitude: clickData.location?.latitude,
        longitude: clickData.location?.longitude,
        accuracy: clickData.location?.accuracy,
        location_permission_granted: clickData.location?.permissionGranted || false,
      });

    if (error) {
      throw error;
    }

    // The trigger will automatically update clicks and last_clicked_at
    // But we'll return the updated URL
    return await this.findOne({ urlCode });
  }

  /**
   * Get click details for a URL
   */
  static async getClickDetails(urlCode, limit = 100) {
    const supabase = getSupabase();
    
    const url = await this.findOne({ urlCode });
    if (!url) {
      return [];
    }

    const { data, error } = await supabase
      .from("click_details")
      .select("*")
      .eq("url_id", url.id)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data.map((click) => this._formatClickDetail(click));
  }

  /**
   * Format URL data from database to match Mongoose format
   */
  static _formatUrl(url) {
    if (!url) return null;
    
    return {
      id: url.id,
      urlCode: url.url_code,
      longUrl: url.long_url,
      shortUrl: url.short_url,
      clicks: url.clicks || 0,
      isCustom: url.is_custom || false,
      date: url.created_at,
      lastClickedAt: url.last_clicked_at,
      expiresAt: url.expires_at,
      // For backward compatibility
      _id: url.id,
    };
  }

  /**
   * Format click detail data
   */
  static _formatClickDetail(click) {
    if (!click) return null;
    
    return {
      timestamp: click.timestamp,
      userAgent: click.user_agent,
      referer: click.referer,
      ip: click.ip,
      location: {
        latitude: click.latitude,
        longitude: click.longitude,
        accuracy: click.accuracy,
        permissionGranted: click.location_permission_granted || false,
      },
    };
  }
}

module.exports = UrlModel;
