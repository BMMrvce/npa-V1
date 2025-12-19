import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

import "./utils/supabase/testConnection.ts";


const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods - allow all origins for now
app.use("/*", cors());

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
  const authHeader = c.req.header('Authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  const looksLikeJwt = (t: string) => t.split('.').length === 3;

  if (!accessToken || accessToken === 'undefined' || accessToken === 'null' || !looksLikeJwt(accessToken)) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const supabase = getSupabaseAdmin();
  let user: any = null;
  try {
    const res = await supabase.auth.getUser(accessToken);
    user = res?.data?.user ?? null;
    const error = res?.error;

    if (error || !user) {
      // Avoid noisy stack traces for expected auth failures (missing/expired/invalid tokens).
      // If you need to debug auth, temporarily add logging of error?.name / error?.message.
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }
  } catch (e) {
    // auth-js can throw (e.g. AuthSessionMissingError) for malformed or empty JWTs.
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  c.set('userId', user.id);
  await next();
};

type UserRole = 'admin' | 'organization' | 'technician';
type UserProfile = {
  user_id: string;
  role: UserRole;
  organization_id: string | null;
  technician_id: string | null;
};

const getOrCreateImplicitAdminProfile = async (userId: string) => {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, role, organization_id, technician_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.log('Error fetching profile:', error.message);
      // Backwards-compatible fallback if migration hasn't been run yet.
      return {
        user_id: userId,
        role: 'admin',
        organization_id: null,
        technician_id: null,
      } satisfies UserProfile;
    }

    if (data) return data as UserProfile;

    // Profile doesn't exist, try to create one
    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .insert({ user_id: userId, role: 'admin' })
      .select('user_id, role, organization_id, technician_id')
      .single();

    if (createErr) {
      console.log('Error creating implicit admin profile:', createErr.message);
      // If profile insert fails (e.g., missing table), still allow app to function as admin.
      return {
        user_id: userId,
        role: 'admin',
        organization_id: null,
        technician_id: null,
      } satisfies UserProfile;
    }

    return created as UserProfile;
  } catch (e) {
    console.error('Unexpected error in getOrCreateImplicitAdminProfile:', e);
    // Always fallback to admin if anything goes wrong
    return {
      user_id: userId,
      role: 'admin',
      organization_id: null,
      technician_id: null,
    } satisfies UserProfile;
  }
};

const requireRole = (allowed: UserRole[]) => {
  return async (c: any, next: any) => {
    try {
      const userId = (c as any).get('userId') as string;
      const profile = await getOrCreateImplicitAdminProfile(userId);
      (c as any).set('profile', profile);
      
      if (!allowed.includes(profile.role)) {
        console.log(`Access denied for user ${userId} with role '${profile.role}'. Required roles: ${allowed.join(', ')}`);
        return c.json({ 
          error: `Forbidden - Your role '${profile.role}' doesn't have access. Required: ${allowed.join(' or ')}` 
        }, 403);
      }
      await next();
    } catch (e) {
      console.error('Error in requireRole:', e);
      return c.json({ error: 'Internal server error during authorization check' }, 500);
    }
  };
};

// Health check endpoint
app.get("/make-server-60660975/health", (c) => {
  return c.json({ status: "ok" });
});

// Debug endpoint - check if profiles table exists and your profile
app.get("/make-server-60660975/debug/profile", requireAuth, async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const supabase = getSupabaseAdmin();
    
    // Try to query profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    const profileExists = data ? true : false;
    const profileRole = data?.role || null;
    
    return c.json({
      userId,
      profileExists,
      profileRole,
      fallbackRole: 'admin',
      profileTableError: error?.message || null,
      note: 'If profileExists is false, the system should create one automatically on first API call'
    });
  } catch (e) {
    console.error('Error in debug endpoint:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Current user role info
app.get('/make-server-60660975/me', requireAuth, async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const profile = await getOrCreateImplicitAdminProfile(userId);
    return c.json({
      userId,
      role: profile.role,
      organizationId: profile.organization_id,
      technicianId: profile.technician_id,
    });
  } catch (e) {
    console.log('Error in /me:', e);
    return c.json({ error: 'Failed to load profile' }, 500);
  }
});

app.get('/me', requireAuth, async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const profile = await getOrCreateImplicitAdminProfile(userId);
    return c.json({
      userId,
      role: profile.role,
      organizationId: profile.organization_id,
      technicianId: profile.technician_id,
    });
  } catch (e) {
    console.log('Error in /me:', e);
    return c.json({ error: 'Failed to load profile' }, 500);
  }
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
app.get("/make-server-60660975/organizations", requireAuth, requireRole(['admin']), async (c) => {
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
app.get("/organizations", requireAuth, requireRole(['admin']), async (c) => {
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
app.post("/make-server-60660975/organizations", requireAuth, requireRole(['admin']), async (c) => {
  try {
    const { companyName, pan, phoneNo, email, gstNo, address } = await c.req.json();
    
    if (!companyName || !pan || !phoneNo || !email || !gstNo) {
      return c.json({ error: 'All required fields must be provided' }, 400);
    }

    // Compute the next unique organization code robustly
    const supabase = getSupabaseAdmin();
    const { data: existingOrgsAll, error: existingErr } = await supabase
      .from('organizations')
      .select('organization_code');
    if (existingErr) {
      console.log('Error reading existing organizations:', existingErr);
    }
    const existingCodes = new Set<string>((existingOrgsAll || [])
      .map((o: any) => String(o.organization_code || '').trim())
      .filter((code) => !!code));

    let nextNumber = 1;
    // Prefer max numeric value if any
    const nums = Array.from(existingCodes)
      .map((code) => code.match(/NPA-(\d+)/))
      .filter(Boolean)
      .map((m) => parseInt((m as RegExpMatchArray)[1], 10));
    if (nums.length > 0) {
      nextNumber = Math.max(...nums) + 1;
    }
    // Ensure the generated code is not already taken (handles non-sequential data)
    let organizationCode = `NPA-${String(nextNumber).padStart(3, '0')}`;
    while (existingCodes.has(organizationCode)) {
      nextNumber += 1;
      organizationCode = `NPA-${String(nextNumber).padStart(3, '0')}`;
    }

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
      console.error('Insert error:', error);
      console.error('Organization data attempted:', organization);
      return c.json({ 
        error: `Database error: ${error.message}`,
        details: error.hint || error.details 
      }, 500);
    }

    // Auto-create org portal auth user + link profile (RBAC)
    const orgRow = data as any;
    const orgId = String(orgRow.id);
    const orgCode = String(orgRow.organization_code || '').trim();
    const orgCodeNoDash = orgCode.replace(/[^A-Za-z0-9]/g, '');
    const emailLocal = orgCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const orgAuthEmail = `${emailLocal}@npa.com`;
    const orgNameSafe = String(companyName || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 24) || 'org';
    const orgAuthPassword = `${orgCodeNoDash}@${orgNameSafe}`;

    const { data: createdUser, error: authErr } = await supabase.auth.admin.createUser({
      email: orgAuthEmail,
      password: orgAuthPassword,
      user_metadata: { name: companyName, organization_id: orgId },
      email_confirm: true,
    });

    let authUserId: string | null = null;
    let authCredentials: { email: string; password: string } | null = null;

    if (authErr || !createdUser?.user) {
      console.error('Warning: Failed to create org auth user:', authErr?.message);
      console.log('Continuing with organization creation without auth setup');
      // Don't fail - just skip auth setup for now
    } else {
      authUserId = createdUser.user.id;
      
      // Link profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(
          { user_id: authUserId, role: 'organization', organization_id: orgId },
          { onConflict: 'user_id' }
        );
      
      if (profileErr) {
        console.error('Warning: Error creating org profile:', profileErr);
        // Try to clean up the auth user if profile linking fails
        try {
          await supabase.auth.admin.deleteUser(authUserId);
        } catch (e) {
          console.error('Could not delete dangling auth user:', e);
        }
        authUserId = null;
      } else {
        // Profile was created successfully, set credentials to return
        authCredentials = { email: orgAuthEmail, password: orgAuthPassword };
        
        // Persist auth link on org row (best-effort if columns exist)
        try {
          await supabase
            .from('organizations')
            .update({
              auth_user_id: authUserId,
              auth_email: orgAuthEmail,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orgId);
        } catch (e) {
          console.error('Warning: Could not update org with auth details:', e);
        }
      }
    }

    // Always return organization as successful
    return c.json({
      success: true,
      organization: { ...orgRow, auth_user_id: authUserId, auth_email: authUserId ? orgAuthEmail : undefined },
      credentials: authCredentials,
      ...(authErr ? { warning: 'Organization created but auth setup failed. You can set up login credentials later.' } : {})
    });
  } catch (error: any) {
    const msg = typeof error?.message === 'string' ? error.message : 'Failed to create organization';
    console.error('Error creating organization:', error);
    console.error('Error stack:', error?.stack);
    return c.json({ 
      error: msg,
      details: error?.details || error?.hint || null
    }, 500);
  }
});

// Update organization
app.put("/make-server-60660975/organizations/:id", requireAuth, requireRole(['admin']), async (c) => {
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
app.patch("/make-server-60660975/organizations/:id/archive", requireAuth, requireRole(['admin']), async (c) => {
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
app.delete("/make-server-60660975/organizations/:id", requireAuth, requireRole(['admin']), async (c) => {
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

// Admin: get/update org portal auth (email) and reset password
app.get('/make-server-60660975/organizations/:id/auth', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const orgId = c.req.param('id');
    const supabase = getSupabaseAdmin();

    const { data: org, error } = await supabase
      .from('organizations')
      .select('id,name,organization_code')
      .eq('id', orgId)
      .single();

    if (error) {
      console.log('Error loading organization:', error);
      return c.json({ error: 'Failed to load organization' }, 500);
    }
    if (!org) return c.json({ error: 'Organization not found' }, 404);

    // Resolve auth user via profiles (works even without organizations.auth_user_id/auth_email columns)
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'organization')
      .eq('organization_id', orgId)
      .maybeSingle();

    const authUserId = (profileRow as any)?.user_id || null;
    let authEmail: string | null = null;
    if (authUserId) {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(authUserId);
      if (!userErr) authEmail = userData?.user?.email || null;
    }

    // Fallback email if not stored yet
    const orgCode = String((org as any).organization_code || '').trim();
    const emailLocal = orgCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const computedEmail = `${emailLocal}@npa.com`;

    return c.json({
      organizationId: orgId,
      authUserId,
      authEmail: authEmail || computedEmail,
    });
  } catch (e) {
    console.log('Error getting org auth:', e);
    return c.json({ error: 'Failed to load org auth' }, 500);
  }
});

app.put('/make-server-60660975/organizations/:id/auth', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const orgId = c.req.param('id');
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'email is required' }, 400);

    const supabase = getSupabaseAdmin();
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id,name,organization_code')
      .eq('id', orgId)
      .single();

    if (error) {
      console.log('Error loading organization for auth update:', error);
      return c.json({ error: 'Failed to load organization' }, 500);
    }
    if (!org) return c.json({ error: 'Organization not found' }, 404);

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'organization')
      .eq('organization_id', orgId)
      .maybeSingle();

    let authUserId = (profileRow as any)?.user_id as string | null;
    let newPassword: string | null = null;

    if (!authUserId) {
      // Create auth user if missing
      const orgCode = String((org as any).organization_code || '').trim();
      const orgCodeNoDash = orgCode.replace(/[^A-Za-z0-9]/g, '');
      const orgNameSafe = String((org as any).name || '')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 24) || 'org';
      newPassword = `${orgCodeNoDash}@${orgNameSafe}`;

      const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: newPassword,
        user_metadata: { name: (org as any).name, organization_id: orgId },
        email_confirm: true,
      });
      if (createErr || !createdUser?.user) {
        return c.json({ error: createErr?.message || 'Failed to create auth user' }, 500);
      }
      authUserId = createdUser.user.id;

      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({ user_id: authUserId, role: 'organization', organization_id: orgId }, { onConflict: 'user_id' });
      if (profileErr) {
        await supabase.auth.admin.deleteUser(authUserId);
        return c.json({ error: 'Failed to link org profile' }, 500);
      }
    } else {
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
        email,
        email_confirm: true,
      });
      if (updateErr) return c.json({ error: updateErr.message }, 400);
    }

    // Best-effort: persist auth link on org row if columns exist
    await supabase
      .from('organizations')
      .update({ auth_user_id: authUserId, auth_email: email, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    return c.json({ success: true, authUserId, authEmail: email, password: newPassword });
  } catch (e) {
    console.log('Error updating org auth:', e);
    return c.json({ error: 'Failed to update org auth' }, 500);
  }
});

app.post('/make-server-60660975/organizations/:id/auth/reset-password', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const orgId = c.req.param('id');
    const supabase = getSupabaseAdmin();
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id,name,organization_code')
      .eq('id', orgId)
      .single();

    if (error) {
      console.log('Error loading organization for password reset:', error);
      return c.json({ error: 'Failed to load organization' }, 500);
    }
    if (!org) return c.json({ error: 'Organization not found' }, 404);

    const orgCode = String((org as any).organization_code || '').trim();
    const orgCodeNoDash = orgCode.replace(/[^A-Za-z0-9]/g, '');
    const orgNameSafe = String((org as any).name || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 24) || 'org';
    const password = `${orgCodeNoDash}@${orgNameSafe}`;

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'organization')
      .eq('organization_id', orgId)
      .maybeSingle();

    const authUserId = (profileRow as any)?.user_id as string | null;
    if (!authUserId) {
      return c.json({ error: 'Org auth user not created yet. Set email first.' }, 400);
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, { password });
    if (updateErr) return c.json({ error: updateErr.message }, 400);

    return c.json({ success: true, password });
  } catch (e) {
    console.log('Error resetting org password:', e);
    return c.json({ error: 'Failed to reset password' }, 500);
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
    const { deviceName, organizationId, model, brandSerialNumber, deviceType } = await c.req.json();

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
    let orgCodeRaw = String(org.organization_code || 'ORG').trim();
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
      device_type: deviceType || 'Comprehensive',
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
    const { deviceName, organizationId, serialNumber, model, status, is_archived, brandSerialNumber, deviceType } = await c.req.json();
    
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
      device_type: deviceType !== undefined ? deviceType : existingDevice.device_type,
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

const computeTechAuth = (techName: string) => {
  const local = String(techName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40) || 'technician';
  return {
    email: `${local}@npa.com`,
    password: `${local}@npa`,
    local,
  };
};

// Get all technicians
app.get("/make-server-60660975/technicians", requireAuth, requireRole(['admin']), async (c) => {
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
app.get("/technicians", requireAuth, requireRole(['admin']), async (c) => {
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
app.post("/make-server-60660975/technicians", requireAuth, requireRole(['admin']), async (c) => {
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

    // Auto-create technician portal auth user + link profile (RBAC)
    const techRow = data as any;
    const techId = String(techRow.id);
    const { email: techAuthEmail, password: techAuthPassword } = computeTechAuth(name);

    const { data: createdUser, error: authErr } = await supabase.auth.admin.createUser({
      email: techAuthEmail,
      password: techAuthPassword,
      user_metadata: { name, technician_id: techId },
      email_confirm: true,
    });

    if (authErr || !createdUser?.user) {
      console.log('Error creating technician auth user:', authErr);
      await supabase.from('technicians').delete().eq('id', techId);
      return c.json({ error: authErr?.message || 'Failed to create technician user' }, 500);
    }

    const authUserId = createdUser.user.id;

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ user_id: authUserId, role: 'technician', technician_id: techId }, { onConflict: 'user_id' });
    if (profileErr) {
      console.log('Error creating technician profile:', profileErr);
      await supabase.auth.admin.deleteUser(authUserId);
      await supabase.from('technicians').delete().eq('id', techId);
      return c.json({ error: 'Failed to link technician user' }, 500);
    }

    // Persist auth link on technician row (best-effort if columns exist)
    await supabase
      .from('technicians')
      .update({ auth_user_id: authUserId, auth_email: techAuthEmail, updated_at: new Date().toISOString() })
      .eq('id', techId);

    return c.json({
      success: true,
      technician: { ...techRow, auth_user_id: authUserId, auth_email: techAuthEmail },
      credentials: { email: techAuthEmail, password: techAuthPassword },
    });
  } catch (error) {
    console.log('Error creating technician:', error);
    return c.json({ error: 'Failed to create technician' }, 500);
  }
});

// Update technician
app.put("/make-server-60660975/technicians/:id", requireAuth, requireRole(['admin']), async (c) => {
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
app.patch("/make-server-60660975/technicians/:id/archive", requireAuth, requireRole(['admin']), async (c) => {
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

// Admin: get/update technician portal auth (email) and reset password
app.get('/make-server-60660975/technicians/:id/auth', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const techId = c.req.param('id');
    const supabase = getSupabaseAdmin();

    const { data: tech, error } = await supabase
      .from('technicians')
      .select('id,name')
      .eq('id', techId)
      .single();

    if (error) {
      console.log('Error loading technician:', error);
      return c.json({ error: 'Failed to load technician' }, 500);
    }
    if (!tech) return c.json({ error: 'Technician not found' }, 404);

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'technician')
      .eq('technician_id', techId)
      .maybeSingle();

    const authUserId = (profileRow as any)?.user_id || null;
    let authEmail: string | null = null;
    if (authUserId) {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(authUserId);
      if (!userErr) authEmail = userData?.user?.email || null;
    }

    const computedEmail = computeTechAuth(String((tech as any).name || '')).email;
    return c.json({
      technicianId: techId,
      authUserId,
      authEmail: authEmail || computedEmail,
    });
  } catch (e) {
    console.log('Error getting technician auth:', e);
    return c.json({ error: 'Failed to load technician auth' }, 500);
  }
});

app.put('/make-server-60660975/technicians/:id/auth', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const techId = c.req.param('id');
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'email is required' }, 400);

    const supabase = getSupabaseAdmin();
    const { data: tech, error } = await supabase
      .from('technicians')
      .select('id,name')
      .eq('id', techId)
      .single();

    if (error) {
      console.log('Error loading technician for auth update:', error);
      return c.json({ error: 'Failed to load technician' }, 500);
    }
    if (!tech) return c.json({ error: 'Technician not found' }, 404);

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'technician')
      .eq('technician_id', techId)
      .maybeSingle();

    let authUserId = (profileRow as any)?.user_id as string | null;
    let newPassword: string | null = null;

    if (!authUserId) {
      const { password } = computeTechAuth(String((tech as any).name || ''));
      newPassword = password;

      const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: newPassword,
        user_metadata: { name: (tech as any).name, technician_id: techId },
        email_confirm: true,
      });

      if (createErr || !createdUser?.user) {
        return c.json({ error: createErr?.message || 'Failed to create auth user' }, 500);
      }

      authUserId = createdUser.user.id;

      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({ user_id: authUserId, role: 'technician', technician_id: techId }, { onConflict: 'user_id' });
      if (profileErr) {
        await supabase.auth.admin.deleteUser(authUserId);
        return c.json({ error: 'Failed to link technician profile' }, 500);
      }
    } else {
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
        email,
        email_confirm: true,
      });
      if (updateErr) return c.json({ error: updateErr.message }, 400);
    }

    // Best-effort: persist auth link on technician row if columns exist
    await supabase
      .from('technicians')
      .update({ auth_user_id: authUserId, auth_email: email, updated_at: new Date().toISOString() })
      .eq('id', techId);

    return c.json({ success: true, authUserId, authEmail: email, password: newPassword });
  } catch (e) {
    console.log('Error updating technician auth:', e);
    return c.json({ error: 'Failed to update technician auth' }, 500);
  }
});

app.post('/make-server-60660975/technicians/:id/auth/reset-password', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const techId = c.req.param('id');
    const supabase = getSupabaseAdmin();

    const { data: tech, error } = await supabase
      .from('technicians')
      .select('id,name')
      .eq('id', techId)
      .single();

    if (error) {
      console.log('Error loading technician for password reset:', error);
      return c.json({ error: 'Failed to load technician' }, 500);
    }
    if (!tech) return c.json({ error: 'Technician not found' }, 404);

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'technician')
      .eq('technician_id', techId)
      .maybeSingle();

    const authUserId = (profileRow as any)?.user_id as string | null;
    if (!authUserId) {
      return c.json({ error: 'Technician auth user not created yet. Set email first.' }, 400);
    }

    const { password } = computeTechAuth(String((tech as any).name || ''));
    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, { password });
    if (updateErr) return c.json({ error: updateErr.message }, 400);

    return c.json({ success: true, password });
  } catch (e) {
    console.log('Error resetting technician password:', e);
    return c.json({ error: 'Failed to reset password' }, 500);
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
    const { deviceId, technicianId, organizationId, notes, date, charges } = await c.req.json();
    
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

    // If charges provided, validate that device is Non Comprehensive before attempting insert
    if (charges !== undefined && charges !== null) {
      const { data: deviceRow, error: deviceErr } = await supabase
        .from('devices')
        .select('device_type')
        .eq('id', deviceId)
        .single();

      if (deviceErr || !deviceRow) {
        return c.json({ error: 'Device not found' }, 404);
      }

      const devType = String(deviceRow.device_type || '').trim().toLowerCase();
      if (devType !== 'non comprehensive') {
        return c.json({ error: 'Charges can only be set for Non Comprehensive devices' }, 400);
      }

      // Validate numeric and non-negative
      const chargesNum = Number(charges);
      if (Number.isNaN(chargesNum) || chargesNum < 0) {
        return c.json({ error: 'Charges must be a non-negative number' }, 400);
      }
    }

    const maintenanceData = {
      device_id: deviceId,
      technician_id: technicianId,
      organization_id: finalOrgId,
      description: notes || '',
      status: 'Yet to Start',
      charges: (charges !== undefined && charges !== null) ? charges : null,
    };

    const { data: maintenance, error } = await supabase
      .from('maintenance')
      .insert(maintenanceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance record:', error);
      const msg = (error && (error.message || '')).toString().toLowerCase();
      if (msg.includes('charges can only be set') || msg.includes('non-comprehensive')) {
        return c.json({ error: 'Charges can only be set for Non Comprehensive devices' }, 400);
      }
      if (msg.includes('numeric') || msg.includes('invalid input syntax for type numeric')) {
        return c.json({ error: 'Invalid numeric value for charges' }, 400);
      }
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

// Update maintenance charges
app.patch("/maintenance/:id/charges", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const id = c.req.param('id');
    const { charges } = await c.req.json();

    if (charges === undefined || charges === null) {
      return c.json({ error: 'Charges value is required' }, 400);
    }

    const chargesNum = Number(charges);
    if (Number.isNaN(chargesNum) || chargesNum < 0) {
      return c.json({ error: 'Charges must be a non-negative number' }, 400);
    }

    // Fetch maintenance record to know device_id
    const { data: existing, error: findErr } = await supabase
      .from('maintenance')
      .select('id, device_id')
      .eq('id', id)
      .single();

    if (findErr || !existing) {
      return c.json({ error: 'Maintenance record not found' }, 404);
    }

    // Check device type
    const { data: deviceRow, error: deviceErr } = await supabase
      .from('devices')
      .select('device_type')
      .eq('id', existing.device_id)
      .single();

    if (deviceErr || !deviceRow) {
      return c.json({ error: 'Device not found' }, 404);
    }

    const devType = String(deviceRow.device_type || '').trim().toLowerCase();
    if (devType !== 'non comprehensive') {
      return c.json({ error: 'Charges can only be set for Non Comprehensive devices' }, 400);
    }

    const { data: updated, error } = await supabase
      .from('maintenance')
      .update({ charges: chargesNum, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance charges:', error);
      return c.json({ error: 'Failed to update charges' }, 500);
    }

    return c.json({ success: true, maintenance: updated });
  } catch (error) {
    console.log('Error updating maintenance charges:', error);
    return c.json({ error: 'Failed to update charges' }, 500);
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

// ==================== TICKETS (RBAC) ====================

// Admin: list all tickets
app.get('/make-server-60660975/tickets', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        organization:organizations(id,name,organization_code),
        device:devices(id,name,serial_number,brand_serial_number),
        technician:technicians(id,name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching tickets:', error);
      return c.json({ error: 'Failed to fetch tickets' }, 500);
    }

    return c.json({ tickets: data || [] });
  } catch (e) {
    console.log('Error fetching tickets:', e);
    return c.json({ error: 'Failed to fetch tickets' }, 500);
  }
});

// Admin: assign technician
app.patch('/make-server-60660975/tickets/:id/assign', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const id = c.req.param('id');
    const { technicianId } = await c.req.json();

    if (!technicianId) {
      return c.json({ error: 'technicianId is required' }, 400);
    }

    const { data: tech, error: techErr } = await supabase
      .from('technicians')
      .select('id')
      .eq('id', technicianId)
      .single();

    if (techErr || !tech) {
      return c.json({ error: 'Technician not found' }, 404);
    }

    const { data: updated, error } = await supabase
      .from('tickets')
      .update({
        assigned_technician_id: technicianId,
        status: 'in_progress',
        assigned_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        organization:organizations(id,name,organization_code),
        device:devices(id,name,serial_number,brand_serial_number),
        technician:technicians(id,name)
      `)
      .single();

    if (error) {
      console.log('Error assigning ticket:', error);
      return c.json({ error: 'Failed to assign ticket' }, 500);
    }

    return c.json({ success: true, ticket: updated });
  } catch (e) {
    console.log('Error assigning ticket:', e);
    return c.json({ error: 'Failed to assign ticket' }, 500);
  }
});

// Admin: update status
app.patch('/make-server-60660975/tickets/:id/status', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    const id = c.req.param('id');
    const { status } = await c.req.json();

    if (!status || !['open', 'assigned', 'in_progress', 'done'].includes(String(status))) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const updates: any = { status };
    if (status === 'done') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(id,name,organization_code),
        device:devices(id,name,serial_number,brand_serial_number),
        technician:technicians(id,name)
      `)
      .single();

    if (error) {
      console.log('Error updating ticket status:', error);
      return c.json({ error: 'Failed to update ticket status' }, 500);
    }

    return c.json({ success: true, ticket: updated });
  } catch (e) {
    console.log('Error updating ticket status:', e);
    return c.json({ error: 'Failed to update ticket status' }, 500);
  }
});

// Organization: dashboard counts
app.get('/make-server-60660975/org/dashboard', requireAuth, requireRole(['organization']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const organizationId = profile.organization_id;
    if (!organizationId) return c.json({ error: 'Organization not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const { data: devices, error } = await supabase
      .from('devices')
      .select('id,status,is_archived')
      .eq('organization_id', organizationId);

    if (error) {
      console.log('Error fetching org devices for dashboard:', error);
      return c.json({ error: 'Failed to load dashboard' }, 500);
    }

    const total = devices?.length || 0;
    const archived = (devices || []).filter((d: any) => d.is_archived === true).length;
    const active = (devices || []).filter((d: any) => d.is_archived !== true && String(d.status || '').toLowerCase() === 'active').length;
    const inactive = total - archived - active;

    const { data: tickets, error: ticketErr } = await supabase
      .from('tickets')
      .select('id,status')
      .eq('organization_id', organizationId);

    if (ticketErr) {
      console.log('Error fetching org tickets for dashboard:', ticketErr);
      return c.json({ error: 'Failed to load dashboard' }, 500);
    }

    const ticketsOpen = (tickets || []).filter((t: any) => t.status === 'open').length;
    const ticketsAssigned = (tickets || []).filter((t: any) => t.status === 'assigned' || t.status === 'in_progress').length;
    const ticketsDone = (tickets || []).filter((t: any) => t.status === 'done').length;

    return c.json({
      devices: { total, active, inactive, archived },
      tickets: { open: ticketsOpen, assigned: ticketsAssigned, done: ticketsDone },
    });
  } catch (e) {
    console.log('Error loading org dashboard:', e);
    return c.json({ error: 'Failed to load dashboard' }, 500);
  }
});

// Organization: list its devices (for ticket creation)
app.get('/make-server-60660975/org/devices', requireAuth, requireRole(['organization']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const organizationId = profile.organization_id;
    if (!organizationId) return c.json({ error: 'Organization not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('devices')
      .select('id,name,serial_number,brand_serial_number,status,is_archived')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching org devices:', error);
      return c.json({ error: 'Failed to fetch devices' }, 500);
    }

    return c.json({ devices: data || [] });
  } catch (e) {
    console.log('Error fetching org devices:', e);
    return c.json({ error: 'Failed to fetch devices' }, 500);
  }
});

// Organization: list its tickets
app.get('/make-server-60660975/org/tickets', requireAuth, requireRole(['organization']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const organizationId = profile.organization_id;
    if (!organizationId) return c.json({ error: 'Organization not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        device:devices(id,name,serial_number,brand_serial_number),
        technician:technicians(id,name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching org tickets:', error);
      return c.json({ error: 'Failed to fetch tickets' }, 500);
    }

    return c.json({ tickets: data || [] });
  } catch (e) {
    console.log('Error fetching org tickets:', e);
    return c.json({ error: 'Failed to fetch tickets' }, 500);
  }
});

// Organization: raise a ticket for a device in its org
app.post('/make-server-60660975/org/tickets', requireAuth, requireRole(['organization']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const organizationId = profile.organization_id;
    if (!organizationId) return c.json({ error: 'Organization not linked' }, 400);

    const userId = (c as any).get('userId') as string;
    const { deviceId, title, description } = await c.req.json();

    if (!deviceId || !title) {
      return c.json({ error: 'deviceId and title are required' }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: device, error: deviceErr } = await supabase
      .from('devices')
      .select('id,organization_id,is_archived')
      .eq('id', deviceId)
      .single();

    if (deviceErr || !device) return c.json({ error: 'Device not found' }, 404);
    if (device.organization_id !== organizationId) return c.json({ error: 'Forbidden' }, 403);
    if (device.is_archived === true) return c.json({ error: 'Cannot raise ticket for archived device' }, 400);

    const payload = {
      organization_id: organizationId,
      device_id: deviceId,
      created_by: userId,
      title: String(title).trim(),
      description: description ? String(description) : '',
      status: 'open',
    };

    const { data: created, error } = await supabase
      .from('tickets')
      .insert(payload)
      .select(`
        *,
        device:devices(id,name,serial_number,brand_serial_number),
        technician:technicians(id,name)
      `)
      .single();

    if (error) {
      console.log('Error creating ticket:', error);
      return c.json({ error: 'Failed to create ticket' }, 500);
    }

    return c.json({ success: true, ticket: created });
  } catch (e) {
    console.log('Error creating ticket:', e);
    return c.json({ error: 'Failed to create ticket' }, 500);
  }
});

// Technician: dashboard counts
app.get('/make-server-60660975/tech/dashboard', requireAuth, requireRole(['technician']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const technicianId = profile.technician_id;
    if (!technicianId) return c.json({ error: 'Technician not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets')
      .select('id,status')
      .eq('assigned_technician_id', technicianId);

    if (error) {
      console.log('Error fetching tech dashboard tickets:', error);
      return c.json({ error: 'Failed to load dashboard' }, 500);
    }

    const total = data?.length || 0;
    const assigned = (data || []).filter((t: any) => t.status === 'assigned' || t.status === 'in_progress').length;
    const done = (data || []).filter((t: any) => t.status === 'done').length;
    const open = (data || []).filter((t: any) => t.status === 'open').length;

    return c.json({ tickets: { total, open, assigned, done } });
  } catch (e) {
    console.log('Error loading tech dashboard:', e);
    return c.json({ error: 'Failed to load dashboard' }, 500);
  }
});

// Technician: list assigned tickets
app.get('/make-server-60660975/tech/tickets', requireAuth, requireRole(['technician']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const technicianId = profile.technician_id;
    if (!technicianId) return c.json({ error: 'Technician not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        organization:organizations(id,name,organization_code),
        device:devices(id,name,serial_number,brand_serial_number)
      `)
      .eq('assigned_technician_id', technicianId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching tech tickets:', error);
      return c.json({ error: 'Failed to fetch tickets' }, 500);
    }

    return c.json({ tickets: data || [] });
  } catch (e) {
    console.log('Error fetching tech tickets:', e);
    return c.json({ error: 'Failed to fetch tickets' }, 500);
  }
});

// Technician: update status of an assigned ticket
app.patch('/make-server-60660975/tech/tickets/:id/status', requireAuth, requireRole(['technician']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const technicianId = profile.technician_id;
    if (!technicianId) return c.json({ error: 'Technician not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const id = c.req.param('id');
    const { status } = await c.req.json();

    if (!status || !['assigned', 'in_progress', 'done'].includes(String(status))) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const { data: existing, error: findErr } = await supabase
      .from('tickets')
      .select('id,assigned_technician_id,status')
      .eq('id', id)
      .single();

    if (findErr || !existing) return c.json({ error: 'Ticket not found' }, 404);
    if (existing.assigned_technician_id !== technicianId) return c.json({ error: 'Forbidden' }, 403);

    const updates: any = { status };
    if (status === 'done') updates.resolved_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(id,name,organization_code),
        device:devices(id,name,serial_number,brand_serial_number)
      `)
      .single();

    if (error) {
      console.log('Error updating ticket status (tech):', error);
      return c.json({ error: 'Failed to update ticket status' }, 500);
    }

    return c.json({ success: true, ticket: updated });
  } catch (e) {
    console.log('Error updating ticket status (tech):', e);
    return c.json({ error: 'Failed to update ticket status' }, 500);
  }
});

// Organization: view maintenance records
app.get('/make-server-60660975/org/maintenance', requireAuth, requireRole(['organization']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const organizationId = profile.organization_id;
    if (!organizationId) return c.json({ error: 'Organization not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('maintenance')
      .select(`
        id,
        device_id,
        technician_id,
        organization_id,
        description,
        status,
        charges,
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching org maintenance:', error);
      return c.json({ error: 'Failed to fetch maintenance records' }, 500);
    }

    return c.json({ maintenance: data || [] });
  } catch (e) {
    console.log('Error fetching org maintenance:', e);
    return c.json({ error: 'Failed to fetch maintenance records' }, 500);
  }
});

// Technician: view all assigned maintenance records
app.get('/make-server-60660975/tech/maintenance', requireAuth, requireRole(['technician']), async (c) => {
  try {
    const profile = (c as any).get('profile') as UserProfile;
    const technicianId = profile.technician_id;
    if (!technicianId) return c.json({ error: 'Technician not linked' }, 400);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('maintenance')
      .select(`
        id,
        device_id,
        technician_id,
        organization_id,
        description,
        status,
        charges,
        created_at,
        updated_at
      `)
      .eq('technician_id', technicianId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching tech maintenance:', error);
      return c.json({ error: 'Failed to fetch maintenance records' }, 500);
    }

    return c.json({ maintenance: data || [] });
  } catch (e) {
    console.log('Error fetching tech maintenance:', e);
    return c.json({ error: 'Failed to fetch maintenance records' }, 500);
  }
});

Deno.serve(app.fetch);


