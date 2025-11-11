import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

import "./utils/supabase/testConnection.ts";


const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client for auth
const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
};

const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
};

// Auth middleware
const requireAuth = async (c: any, next: any) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    console.log('Authorization error in requireAuth middleware:', error);
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  c.set('userId', user.id);
  await next();
};

// Health check endpoint
app.get("/make-server-60660975/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Sign up
app.post("/make-server-60660975/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Error creating user during signup:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Unexpected error in signup route:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// ==================== ORGANIZATION ROUTES ====================

// Test endpoint to see database schema
app.get("/test/schema", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    
    // Try to get one row to see the actual column structure
    const { data, error } = await supabase.from('organizations').select('*').limit(1);
    
    if (error) {
      return c.json({ error: error.message });
    }
    
    // Also try to describe the table structure
    const { data: allData, error: allError } = await supabase.from('organizations').select('*');
    
    return c.json({ 
      message: "Schema inspection", 
      sampleRow: data && data.length > 0 ? data[0] : "No rows yet",
      sampleColumns: data && data.length > 0 ? Object.keys(data[0]) : "No rows to inspect",
      totalRows: allData ? allData.length : 0
    });
  } catch (error) {
    return c.json({ error: String(error) });
  }
});

// Get all organizations
app.get("/make-server-60660975/organizations", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .order('organization_code', { ascending: true });
    
    if (error) {
      console.log('Error details:', error);
      throw new Error(error.message);
    }
    
    return c.json({ organizations: organizations || [] });
  } catch (error) {
    console.log('Error fetching organizations:', error);
    return c.json({ error: 'Failed to fetch organizations' }, 500);
  }
});

// Duplicate route without prefix
app.get("/organizations", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .order('organization_code', { ascending: true });
    
    if (error) {
      console.log('Error details:', error);
      throw new Error(error.message);
    }
    
    return c.json({ organizations: organizations || [] });
  } catch (error) {
    console.log('Error fetching organizations:', error);
    return c.json({ error: 'Failed to fetch organizations' }, 500);
  }
});

// Create organization
app.post("/make-server-60660975/organizations", requireAuth, async (c) => {
  try {
    const { companyName, pan, phoneNo, email, gstNo, address } = await c.req.json();
    
    if (!companyName || !pan || !phoneNo || !email || !gstNo) {
      return c.json({ error: 'All required fields must be provided' }, 400);
    }

    // Get current max organization number from existing organizations
    const supabase = getSupabaseAdmin();
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('organization_code')
      .order('organization_code', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (existingOrgs && existingOrgs.length > 0 && existingOrgs[0].organization_code) {
      const lastCode = existingOrgs[0].organization_code;
      const match = lastCode.match(/NPA-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Generate organization code (NPA-001, NPA-002, etc.)
    const organizationCode = `NPA-${String(nextNumber).padStart(3, '0')}`;

    const organization = {
      name: companyName,
      code: organizationCode, // For legacy 'code' column
      organization_code: organizationCode,
      pan,
      phone_no: phoneNo,
      email,
      gst_no: gstNo,
      address: address || null,
      archived: false,
    };

    const { data, error } = await supabase
      .from('organizations')
      .insert(organization)
      .select()
      .single();
      
    if (error) {
      console.log('Insert error:', error);
      throw new Error(error.message);
    }

    return c.json({ success: true, organization: data });
  } catch (error) {
    console.log('Error creating organization:', error);
    return c.json({ error: 'Failed to create organization' }, 500);
  }
});

// Update organization
app.put("/make-server-60660975/organizations/:id", requireAuth, async (c) => {
  try {
    const orgId = c.req.param('id');
    const { companyName, pan, phoneNo, email, gstNo, address } = await c.req.json();
    
    if (!companyName || !pan || !phoneNo || !email || !gstNo) {
      return c.json({ error: 'All required fields must be provided' }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: organization, error } = await supabase
      .from('organizations')
      .update({
        name: companyName,
        pan,
        phone_no: phoneNo,
        email,
        gst_no: gstNo,
        address: address || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }

    return c.json({ success: true, organization });
  } catch (error) {
    console.log('Error updating organization:', error);
    return c.json({ error: 'Failed to update organization' }, 500);
  }
});// Archive/Unarchive organization
app.patch("/make-server-60660975/organizations/:id/archive", requireAuth, async (c) => {
  try {
    const orgId = c.req.param('id');
    const { archived } = await c.req.json();
    
    const supabase = getSupabaseAdmin();
    const { data: organization, error } = await supabase
      .from('organizations')
      .update({
        archived: archived,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return c.json({ success: true, organization });
  } catch (error) {
    console.log('Error archiving organization:', error);
    return c.json({ error: 'Failed to archive organization' }, 500);
  }
});

// Delete organization (keep as fallback)
app.delete("/make-server-60660975/organizations/:id", requireAuth, async (c) => {
  try {
    const orgId = c.req.param('id');
    
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) {
      throw new Error(error.message);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting organization:', error);
    return c.json({ error: 'Failed to delete organization' }, 500);
  }
});

// ==================== DEVICE ROUTES ====================

// Get all devices
app.get("/make-server-60660975/devices", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.log('Error fetching devices:', error);
      throw new Error(error.message);
    }
    
    return c.json({ devices: devices || [] });
  } catch (error) {
    console.log('Error fetching devices:', error);
    return c.json({ error: 'Failed to fetch devices' }, 500);
  }
});

// Duplicate route without prefix
app.get("/devices", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.log('Error fetching devices:', error);
      throw new Error(error.message);
    }
    
    return c.json({ devices: devices || [] });
  } catch (error) {
    console.log('Error fetching devices:', error);
    return c.json({ error: 'Failed to fetch devices' }, 500);
  }
});

// Create device
app.post("/make-server-60660975/devices", requireAuth, async (c) => {
  try {
    const { deviceName, organizationId, model, brandSerialNumber } = await c.req.json();

    if (!deviceName || !organizationId) {
      return c.json({ error: 'Device name and organization are required' }, 400);
    }

    const supabase = getSupabaseAdmin();

    // Check if organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, organization_code')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    // Generate device code based on organization code and count
    const { data: existingDevices } = await supabase
      .from('devices')
      .select('id')
      .eq('organization_id', organizationId);

    const deviceCount = (existingDevices?.length || 0) + 1;

    // Prepare a sanitized organization code so serials include full 'NPA-XXX' form.
    let orgCodeRaw = String(org.organization_code || org.code || 'ORG').trim();
    // Collapse multiple leading 'NPA-' into a single 'NPA-'
    let orgCodeSafe = orgCodeRaw.replace(/^(?:NPA-)+/i, 'NPA-');
    // If it doesn't start with NPA-, prefix it so serials become 'NPA-XXX'
    if (!/^NPA-/i.test(orgCodeSafe)) {
      orgCodeSafe = `NPA-${orgCodeSafe}`;
    }
    // Guard: remove accidental double hyphens after prefixing
    orgCodeSafe = orgCodeSafe.replace(/NPA-+-/, 'NPA-');

    const deviceCode = `${orgCodeSafe}-${String(deviceCount).padStart(6, '0')}`;

  // Generate serial number in format ORGCODE-YEAR-XXXXXX (increment per org+year)
  // Use sanitized org code (orgCodeSafe) so we don't include a global NPA prefix twice
  const year = new Date().getFullYear();
  const prefix = `${orgCodeSafe}-${year}-`;

    // Count existing serials for this org+year prefix
    const { data: serialMatches, error: serialErr } = await supabase
      .from('devices')
      .select('id')
      .like('serial_number', `${prefix}%`);

    if (serialErr) {
      console.log('Error counting existing serials:', serialErr);
      return c.json({ error: 'Internal server error' }, 500);
    }

    const nextSerialNumber = (serialMatches?.length || 0) + 1;
    const serialNumberGenerated = `${prefix}${String(nextSerialNumber).padStart(6, '0')}`;

    // If a brand serial number was provided, ensure it is unique (exclude empty values)
    if (brandSerialNumber && brandSerialNumber !== '') {
      const { data: existingBrand, error: brandErr } = await supabase
        .from('devices')
        .select('id')
        .eq('brand_serial_number', brandSerialNumber)
        .limit(1);

      if (brandErr) {
        console.log('Error checking brand serial uniqueness:', brandErr);
        return c.json({ error: 'Internal server error' }, 500);
      }

      if (existingBrand && existingBrand.length > 0) {
        return c.json({ error: 'Brand serial number already exists for another device' }, 400);
      }
    }

    const device = {
      name: deviceName,
      code: deviceCode,
      organization_id: organizationId,
      serial_number: serialNumberGenerated,
      brand_serial_number: brandSerialNumber || '',
      model: model || '',
      status: 'active',
    };

    const { data, error } = await supabase
      .from('devices')
      .insert(device)
      .select()
      .single();

    if (error) {
      console.log('Insert error:', error);
      // Try to detect unique-violation messages and return a friendly error
      const msg = (error && (error.message || '')).toString();
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        return c.json({ error: 'Brand serial number already exists' }, 400);
      }
      throw new Error(error.message);
    }

    return c.json({ success: true, device: data });
  } catch (error) {
    console.log('Error creating device:', error);
    return c.json({ error: 'Failed to create device' }, 500);
  }
});

// Update device
app.put("/make-server-60660975/devices/:id", requireAuth, async (c) => {
  try {
    const deviceId = c.req.param('id');
    const { deviceName, organizationId, serialNumber, model, status, is_archived, brandSerialNumber } = await c.req.json();
    
    if (!deviceName || !organizationId || !serialNumber) {
      return c.json({ error: 'Device name, organization, and serial number are required' }, 400);
    }
    const supabase = getSupabaseAdmin();

    // Verify device exists
    const { data: existingDevice, error: findErr } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (findErr || !existingDevice) {
      return c.json({ error: 'Device not found' }, 404);
    }

    // Check if organization exists
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgErr || !org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    // Note: serial_number is system-generated and immutable. Do not allow updates to it via this endpoint.

    // If brandSerialNumber provided and changed, ensure uniqueness (exclude empty values)
    if (brandSerialNumber !== undefined && brandSerialNumber !== '' && brandSerialNumber !== existingDevice.brand_serial_number) {
      const { data: existingBrand, error: brandErr } = await supabase
        .from('devices')
        .select('id')
        .eq('brand_serial_number', brandSerialNumber)
        .neq('id', deviceId)
        .limit(1);

      if (brandErr) {
        console.log('Error checking brand serial uniqueness (update):', brandErr);
        return c.json({ error: 'Internal server error' }, 500);
      }

      if (existingBrand && existingBrand.length > 0) {
        return c.json({ error: 'Brand serial number already exists for another device' }, 400);
      }
    }

    const updates: any = {
      name: deviceName,
      organization_id: organizationId,
      // keep serial_number untouched (immutable)
      brand_serial_number: brandSerialNumber !== undefined ? brandSerialNumber : existingDevice.brand_serial_number,
      model: model || '',
      status: status || 'active',
      is_archived: is_archived !== undefined ? is_archived : false,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedDevice, error: updateErr } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', deviceId)
      .select()
      .single();

    if (updateErr) {
      console.log('Error updating device:', updateErr);
      return c.json({ error: 'Failed to update device' }, 500);
    }

    return c.json({ success: true, device: updatedDevice });
  } catch (error) {
    console.log('Error updating device:', error);
    return c.json({ error: 'Failed to update device' }, 500);
  }
});

// Archive/Unarchive device
app.patch("/make-server-60660975/devices/:id/archive", requireAuth, async (c) => {
  try {
    const deviceId = c.req.param('id');
    const { archived } = await c.req.json();
    const supabase = getSupabaseAdmin();

    const { data: existingDevice, error: findErr } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (findErr || !existingDevice) {
      return c.json({ error: 'Device not found' }, 404);
    }

    const { data: updatedDevice, error: updateErr } = await supabase
      .from('devices')
      .update({ is_archived: archived, updated_at: new Date().toISOString() })
      .eq('id', deviceId)
      .select()
      .single();

    if (updateErr) {
      console.log('Error archiving device:', updateErr);
      return c.json({ error: 'Failed to archive device' }, 500);
    }

    return c.json({ success: true, device: updatedDevice });
  } catch (error) {
    console.log('Error archiving device:', error);
    return c.json({ error: 'Failed to archive device' }, 500);
  }
});

// ==================== TECHNICIAN ROUTES ====================

// Get all technicians
app.get("/make-server-60660975/technicians", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: technicians, error } = await supabase
      .from('technicians')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return c.json({ technicians: technicians || [] });
  } catch (error) {
    console.log('Error fetching technicians:', error);
    return c.json({ error: 'Failed to fetch technicians' }, 500);
  }
});

// Duplicate route without prefix
app.get("/technicians", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: technicians, error } = await supabase
      .from('technicians')
      .select('*')
      .order('created_at', { ascending: false});
      
    if (error) throw error;
    
    return c.json({ technicians: technicians || [] });
  } catch (error) {
    console.log('Error fetching technicians:', error);
    return c.json({ error: 'Failed to fetch technicians' }, 500);
  }
});

// Create technician
app.post("/make-server-60660975/technicians", requireAuth, async (c) => {
  try {
    const { name, contactNo, email, pan, aadhar } = await c.req.json();
    
    if (!name || !contactNo || !email || !pan || !aadhar) {
      return c.json({ error: 'Name, contact, email, PAN and Aadhar are required' }, 400);
    }

    const supabase = getSupabaseAdmin();
    
    // Generate technician code
    const { data: existingTechs } = await supabase
      .from('technicians')
      .select('id');
    
    const techCount = (existingTechs?.length || 0) + 1;
    const techCode = `TECH-${String(techCount).padStart(6, '0')}`;

    const technician = {
      name,
      code: techCode,
      phone: contactNo,
      email,
      pan,
      aadhar,
      is_archived: false,
    };

    const { data, error } = await supabase
      .from('technicians')
      .insert(technician)
      .select()
      .single();
      
    if (error) {
      console.log('Insert error:', error);
      throw new Error(error.message);
    }

    return c.json({ success: true, technician: data });
  } catch (error) {
    console.log('Error creating technician:', error);
    return c.json({ error: 'Failed to create technician' }, 500);
  }
});

// Update technician
app.put("/make-server-60660975/technicians/:id", requireAuth, async (c) => {
  try {
    const techId = c.req.param('id');
    const { name, contactNo, email, pan, aadhar } = await c.req.json();
    
    if (!name || !contactNo || !email || !pan || !aadhar) {
      return c.json({ error: 'Name, contact, email, PAN and Aadhar are required' }, 400);
    }

    const supabase = getSupabaseAdmin();
    
    const technician = {
      name,
      phone: contactNo,
      email,
      pan,
      aadhar,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('technicians')
      .update(technician)
      .eq('id', techId)
      .select()
      .single();
      
    if (error) {
      console.log('Update error:', error);
      throw new Error(error.message);
    }

    return c.json({ success: true, technician: data });
  } catch (error) {
    console.log('Error updating technician:', error);
    return c.json({ error: 'Failed to update technician' }, 500);
  }
});

// Archive/Unarchive technician
app.patch("/make-server-60660975/technicians/:id/archive", requireAuth, async (c) => {
  try {
    const techId = c.req.param('id');
    const { archived } = await c.req.json();
    const supabase = getSupabaseAdmin();

    const { data: existingTech, error: findErr } = await supabase
      .from('technicians')
      .select('*')
      .eq('id', techId)
      .single();

    if (findErr || !existingTech) {
      return c.json({ error: 'Technician not found' }, 404);
    }

    const { data: updatedTech, error: updateErr } = await supabase
      .from('technicians')
      .update({ is_archived: archived, updated_at: new Date().toISOString() })
      .eq('id', techId)
      .select()
      .single();

    if (updateErr) {
      console.log('Error archiving technician:', updateErr);
      return c.json({ error: 'Failed to archive technician' }, 500);
    }

    return c.json({ success: true, technician: updatedTech });
  } catch (error) {
    console.log('Error archiving technician:', error);
    return c.json({ error: 'Failed to archive technician' }, 500);
  }
});

// ==================== MAINTENANCE ROUTES ====================

// Get all maintenance records
app.get("/maintenance", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: maintenance, error } = await supabase
      .from('maintenance')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching maintenance records:', error);
      return c.json({ error: 'Failed to fetch maintenance records' }, 500);
    }

    return c.json({ maintenance: maintenance || [] });
  } catch (error) {
    console.log('Error fetching maintenance records:', error);
    return c.json({ error: 'Failed to fetch maintenance records' }, 500);
  }
});

// Get maintenance by device
app.get("/maintenance/device/:deviceId", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const deviceId = c.req.param('deviceId');

    const { data: maintenance, error } = await supabase
      .from('maintenance')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching device maintenance records:', error);
      return c.json({ error: 'Failed to fetch maintenance records' }, 500);
    }

    return c.json({ maintenance: maintenance || [] });
  } catch (error) {
    console.log('Error fetching device maintenance records:', error);
    return c.json({ error: 'Failed to fetch maintenance records' }, 500);
  }
});

// Get maintenance by organization
app.get("/maintenance/organization/:orgId", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const orgId = c.req.param('orgId');
    
    let query = supabase
      .from('maintenance')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    const { data: maintenance, error } = await query;

    if (error) {
      console.error('Error fetching organization maintenance records:', error);
      return c.json({ error: 'Failed to fetch maintenance records' }, 500);
    }

    return c.json({ maintenance: maintenance || [] });
  } catch (error) {
    console.log('Error fetching organization maintenance records:', error);
    return c.json({ error: 'Failed to fetch maintenance records' }, 500);
  }
});

// Dual route for organization maintenance report
app.get("/make-server-60660975/maintenance/organization/:orgId", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const orgId = c.req.param('orgId');
    
    let query = supabase
      .from('maintenance')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    const { data: maintenance, error } = await query;

    if (error) {
      console.error('Error fetching organization maintenance records:', error);
      return c.json({ error: 'Failed to fetch maintenance records' }, 500);
    }

    return c.json({ maintenance: maintenance || [] });
  } catch (error) {
    console.log('Error fetching organization maintenance records:', error);
    return c.json({ error: 'Failed to fetch maintenance records' }, 500);
  }
});

// Dual route for device maintenance
app.get("/make-server-60660975/maintenance/device/:deviceId", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const deviceId = c.req.param('deviceId');

    const { data: maintenance, error } = await supabase
      .from('maintenance')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching device maintenance records:', error);
      return c.json({ error: 'Failed to fetch maintenance records' }, 500);
    }

    return c.json({ maintenance: maintenance || [] });
  } catch (error) {
    console.log('Error fetching device maintenance records:', error);
    return c.json({ error: 'Failed to fetch maintenance records' }, 500);
  }
});

// Create maintenance record
app.post("/maintenance", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { deviceId, technicianId, organizationId, notes, date } = await c.req.json();
    
    if (!deviceId || !technicianId) {
      return c.json({ error: 'Device and technician are required' }, 400);
    }

    // Get organization_id from device if not provided
    let finalOrgId = organizationId;
    if (!finalOrgId) {
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('organization_id')
        .eq('id', deviceId)
        .single();
      
      if (deviceError || !device) {
        return c.json({ error: 'Device not found' }, 404);
      }
      
      finalOrgId = device.organization_id;
    }

    // Check if at least one technician exists
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id');
    
    if (techError || !technicians || technicians.length === 0) {
      return c.json({ error: 'Cannot schedule maintenance: No active technicians available. Please add a technician first.' }, 400);
    }

    const maintenanceData = {
      device_id: deviceId,
      technician_id: technicianId,
      organization_id: finalOrgId,
      description: notes || '',
      status: 'Yet to Start',
    };

    const { data: maintenance, error } = await supabase
      .from('maintenance')
      .insert(maintenanceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance record:', error);
      return c.json({ error: 'Failed to create maintenance record' }, 500);
    }

    return c.json({ success: true, maintenance });
  } catch (error) {
    console.log('Error creating maintenance record:', error);
    return c.json({ error: 'Failed to create maintenance record' }, 500);
  }
});

// Update maintenance status
app.patch("/maintenance/:id/status", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const id = c.req.param('id');
    const { status } = await c.req.json();
    
    if (!status) {
      return c.json({ error: 'Status is required' }, 400);
    }

    const { data: maintenance, error } = await supabase
      .from('maintenance')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance status:', error);
      return c.json({ error: 'Failed to update status' }, 500);
    }

    return c.json({ success: true, maintenance });
  } catch (error) {
    console.log('Error updating maintenance status:', error);
    return c.json({ error: 'Failed to update status' }, 500);
  }
});

// Update maintenance notes/description
app.patch("/maintenance/:id/notes", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const id = c.req.param('id');
    const { notes } = await c.req.json();

    const { data: maintenance, error } = await supabase
      .from('maintenance')
      .update({ description: notes || '' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance notes:', error);
      return c.json({ error: 'Failed to update notes' }, 500);
    }

    return c.json({ success: true, maintenance });
  } catch (error) {
    console.log('Error updating maintenance notes:', error);
    return c.json({ error: 'Failed to update notes' }, 500);
  }
});

// Bulk create maintenance records for organization
app.post("/maintenance/bulk", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { organizationId, deviceIds, technicianId, notes, date } = await c.req.json();
    
    if (!organizationId || !deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0 || !technicianId) {
      return c.json({ error: 'Organization, device IDs array, and technician are required' }, 400);
    }

    // Check if at least one technician exists
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id');
    
    if (techError || !technicians || technicians.length === 0) {
      return c.json({ error: 'Cannot schedule maintenance: No active technicians available. Please add a technician first.' }, 400);
    }

    const maintenanceRecords = deviceIds.map(deviceId => ({
      device_id: deviceId,
      technician_id: technicianId,
      organization_id: organizationId,
      description: notes || '',
      status: 'Yet to Start',
    }));

    const { data: createdRecords, error } = await supabase
      .from('maintenance')
      .insert(maintenanceRecords)
      .select();

    if (error) {
      console.error('Error creating bulk maintenance records:', error);
      return c.json({ error: 'Failed to create maintenance records' }, 500);
    }

    return c.json({ success: true, count: createdRecords?.length || 0, maintenance: createdRecords });
  } catch (error) {
    console.log('Error creating bulk maintenance records:', error);
    return c.json({ error: 'Failed to create bulk maintenance records' }, 500);
  }
});

// Dual route for bulk maintenance
app.post("/make-server-60660975/maintenance/bulk", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { organizationId, deviceIds, technicianId, notes, date } = await c.req.json();
    
    if (!organizationId || !deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0 || !technicianId) {
      return c.json({ error: 'Organization, device IDs array, and technician are required' }, 400);
    }

    // Check if at least one technician exists
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id');
    
    if (techError || !technicians || technicians.length === 0) {
      return c.json({ error: 'Cannot schedule maintenance: No active technicians available. Please add a technician first.' }, 400);
    }

    const maintenanceRecords = deviceIds.map(deviceId => ({
      device_id: deviceId,
      technician_id: technicianId,
      organization_id: organizationId,
      description: notes || '',
      status: 'Yet to Start',
    }));

    const { data: createdRecords, error } = await supabase
      .from('maintenance')
      .insert(maintenanceRecords)
      .select();

    if (error) {
      console.error('Error creating bulk maintenance records:', error);
      return c.json({ error: 'Failed to create maintenance records' }, 500);
    }

    return c.json({ success: true, count: createdRecords?.length || 0, maintenance: createdRecords });
  } catch (error) {
    console.log('Error creating bulk maintenance records:', error);
    return c.json({ error: 'Failed to create bulk maintenance records' }, 500);
  }
});

Deno.serve(app.fetch);
createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)


