const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

/**
 * GET /api/bookings
 * Query params: branch_id, date, status
 */
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customers(name, phone, email),
        services(name, duration_minutes, price),
        employees(name),
        beds(name),
        branches(name)
      `)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: true });

    if (req.query.branch_id) query = query.eq('branch_id', req.query.branch_id);
    if (req.query.date) query = query.eq('booking_date', req.query.date);
    if (req.query.date_from) query = query.gte('booking_date', req.query.date_from);
    if (req.query.date_to) query = query.lte('booking_date', req.query.date_to);
    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bookings/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers(name, phone, email),
        services(name, duration_minutes, price),
        employees(name),
        beds(name),
        branches(name)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/bookings/:id
 * Update booking detail (service, branch, start_time, employee)
 * Body: { service_id, branch_id, start_time, employee_id }
 */
router.put('/:id', async (req, res) => {
  try {
    const { service_id, branch_id, start_time, employee_id } = req.body;

    // Basic validation
    if (!service_id || !branch_id || !start_time || !employee_id) {
      return res.status(400).json({ error: 'service_id, branch_id, start_time, employee_id are required' });
    }

    // 1) Load booking
    const { data: booking, error: bkErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (bkErr || !booking) return res.status(404).json({ error: 'Booking not found' });

    // 2) Load service (duration/price)
    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('id, duration_minutes, price')
      .eq('id', service_id)
      .single();

    if (svcErr || !service) return res.status(404).json({ error: 'Service not found' });

    // 3) Validate branch exists
    const { data: branch, error: brErr } = await supabase
      .from('branches')
      .select('id')
      .eq('id', branch_id)
      .single();

    if (brErr || !branch) return res.status(404).json({ error: 'Branch not found' });

    // 4) Validate employee exists and belongs to branch
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('id, branch_id, is_active')
      .eq('id', employee_id)
      .single();

    if (empErr || !emp) return res.status(404).json({ error: 'Employee not found' });
    if (!emp.is_active) return res.status(409).json({ error: 'Employee is inactive' });
    if (emp.branch_id !== branch_id) {
      return res.status(409).json({ error: 'Employee does not belong to selected branch' });
    }

    // 5) Recalculate end_time & price
    const startMinutes = timeToMinutes(start_time);
    const endMinutes = startMinutes + (service.duration_minutes || 60);
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // NOTE: total_price in your create flow is stored as service.price (not * num_guests)
    const total_price = service.price || 0;

    // 6) Update
    const { data: updated, error: upErr } = await supabase
      .from('bookings')
      .update({
        service_id,
        branch_id,
        employee_id,
        start_time,
        end_time,
        total_price
      })
      .eq('id', req.params.id)
      .select(`
        *,
        customers(name, phone, email, habits),
        services(name, duration_minutes, price),
        employees(name),
        beds(name),
        branches(name)
      `)
      .single();

    if (upErr) throw upErr;

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/bookings
 * Body:
 *   branch_id,
 *   service_id (nullable for Skip),
 *   duration_minutes (required if service_id is null),
 *   num_guests,
 *   customer_name, customer_phone, customer_email,
 *   booking_date, start_time, notes
 */
router.post('/', async (req, res) => {
  try {
    const {
      branch_id, service_id, duration_minutes, num_guests,
      customer_name, customer_phone, customer_email,
      booking_date, start_time, notes
    } = req.body;

    if (!branch_id || !customer_name || !customer_phone || !booking_date || !start_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const guestCount = parseInt(num_guests) || 1;

    // 1) Resolve service-like data (duration + price)
    let resolvedService = null;
    let duration = null;
    let price = 0;

    if (service_id) {
      const { data: service, error: serviceErr } = await supabase
        .from('services')
        .select('*')
        .eq('id', service_id)
        .single();

      if (serviceErr || !service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      resolvedService = service;
      duration = service.duration_minutes;
      price = service.price || 0;
    } else {
      duration = parseInt(duration_minutes) || 60;
      price = 0;
    }

    // 2) Calculate end_time
    const startMinutes = timeToMinutes(start_time);
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // 3) Find or create customer
    let customer;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', customer_phone)
      .single();

    if (existingCustomer) {
      customer = existingCustomer;
      if (customer_name !== existingCustomer.name || (customer_email && customer_email !== existingCustomer.email)) {
        const updateData = { name: customer_name };
        if (customer_email) updateData.email = customer_email;
        const { data: updated } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', existingCustomer.id)
          .select()
          .single();
        if (updated) customer = updated;
      }
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert([{ name: customer_name, phone: customer_phone, email: customer_email || null }])
        .select()
        .single();

      if (custErr) throw custErr;
      customer = newCustomer;
    }

    // 4) Load existing bookings in branch/day
    const { data: dayBookings, error: dayErr } = await supabase
      .from('bookings')
      .select('employee_id, bed_id, start_time, end_time')
      .eq('branch_id', branch_id)
      .eq('booking_date', booking_date)
      .neq('status', 'cancelled');

    if (dayErr) throw dayErr;

    // 5) Load active employees
    const { data: allEmployees, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('branch_id', branch_id)
      .eq('is_active', true);

    if (empErr) throw empErr;

    // 5.1) Apply schedule rule: employee must have schedule record for that date (not day off)
    const empIds = allEmployees.map(e => e.id);
    let schedules = [];
    if (empIds.length > 0) {
      const { data: schedData, error: schedErr } = await supabase
        .from('employee_schedules')
        .select('employee_id, start_time, end_time, is_day_off')
        .in('employee_id', empIds)
        .eq('date', booking_date);

      if (schedErr) throw schedErr;
      schedules = schedData || [];
    }
    const scheduleByEmp = new Map();
    for (const s of schedules) scheduleByEmp.set(s.employee_id, s);

    const employees = allEmployees.filter(e => {
      const s = scheduleByEmp.get(e.id);
      if (!s) return false;         // missing => unavailable (deleted)
      if (s.is_day_off) return false;
      if (!s.start_time || !s.end_time) return false;

      const sStart = timeToMinutes(String(s.start_time).substring(0, 5));
      const sEnd = timeToMinutes(String(s.end_time).substring(0, 5));
      return startMinutes >= sStart && endMinutes <= sEnd;
    });

    if (employees.length < guestCount) {
      return res.status(409).json({ error: 'Not enough employees available for this day' });
    }

    // 6) Load active beds
    const { data: beds, error: bedErr } = await supabase
      .from('beds')
      .select('id')
      .eq('branch_id', branch_id)
      .eq('is_active', true);

    if (bedErr) throw bedErr;

    // 7) Create bookings for each guest (auto assign employee/bed)
    const createdBookings = [];

    for (let g = 0; g < guestCount; g++) {
      const busyEmployeeIds = new Set();
      const allRelevantBookings = [...dayBookings, ...createdBookings.map(b => ({
        employee_id: b.employee_id,
        bed_id: b.bed_id,
        start_time: b.start_time,
        end_time: b.end_time
      }))];

      for (const booking of allRelevantBookings) {
        const bStart = timeToMinutes(booking.start_time);
        const bEnd = timeToMinutes(booking.end_time);
        if (startMinutes < bEnd && bStart < endMinutes) {
          busyEmployeeIds.add(booking.employee_id);
        }
      }

      const availableEmployees = employees.filter(e => !busyEmployeeIds.has(e.id));
      if (availableEmployees.length === 0) {
        return res.status(409).json({ error: 'No employees available for this time slot' });
      }

      // booking count for fairness
      const employeeBookingCount = {};
      for (const emp of employees) employeeBookingCount[emp.id] = 0;
      for (const booking of allRelevantBookings) {
        if (employeeBookingCount[booking.employee_id] !== undefined) employeeBookingCount[booking.employee_id]++;
      }

      availableEmployees.sort((a, b) => (employeeBookingCount[a.id] || 0) - (employeeBookingCount[b.id] || 0));
      const assignedEmployee = availableEmployees[0];

      // Beds
      const busyBedIds = new Set();
      for (const booking of allRelevantBookings) {
        const bStart = timeToMinutes(booking.start_time);
        const bEnd = timeToMinutes(booking.end_time);
        if (startMinutes < bEnd && bStart < endMinutes) {
          busyBedIds.add(booking.bed_id);
        }
      }

      const availableBeds = beds.filter(b => !busyBedIds.has(b.id));
      if (availableBeds.length === 0) {
        return res.status(409).json({ error: 'No beds available for this time slot' });
      }

      const bedBookingCount = {};
      for (const bed of beds) bedBookingCount[bed.id] = 0;
      for (const booking of allRelevantBookings) {
        if (bedBookingCount[booking.bed_id] !== undefined) bedBookingCount[booking.bed_id]++;
      }

      availableBeds.sort((a, b) => (bedBookingCount[a.id] || 0) - (bedBookingCount[b.id] || 0));
      const assignedBed = availableBeds[0];

      // Create booking row
      const insertPayload = {
        customer_id: customer.id,
        service_id: service_id || null,
        employee_id: assignedEmployee.id,
        bed_id: assignedBed.id,
        branch_id,
        num_guests: guestCount,
        booking_date,
        start_time,
        end_time,
        status: 'confirmed',
        total_price: price,
        notes: notes || null
      };

      const { data: booking, error: bookErr } = await supabase
        .from('bookings')
        .insert([insertPayload])
        .select(`
          *,
          customers(name, phone, email),
          services(name, duration_minutes, price),
          employees(name),
          beds(name),
          branches(name)
        `)
        .single();

      if (bookErr) throw bookErr;
      createdBookings.push(booking);
    }

    const result = createdBookings.length === 1 ? createdBookings[0] : createdBookings;

    // Fire webhooks async (keep your old logic)
    fireWebhooks('booking.confirmed', createdBookings).catch(err =>
      console.error('Webhook fire error:', err.message)
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/bookings/:id/status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', req.params.id)
      .select(`
        *,
        customers(name, phone, email),
        services(name, duration_minutes, price),
        employees(name),
        beds(name),
        branches(name)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/bookings/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function timeToMinutes(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

async function fireWebhooks(event, bookings) {
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('event', event)
    .eq('is_active', true);

  if (!webhooks || webhooks.length === 0) return;

  const bookingList = Array.isArray(bookings) ? bookings : [bookings];

  for (const webhook of webhooks) {
    for (const booking of bookingList) {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data: {
          booking_id: booking.id,
          customer_name: booking.customers?.name || '',
          customer_phone: booking.customers?.phone || '',
          customer_email: booking.customers?.email || '',
          service_name: booking.services?.name || '',
          service_duration: booking.services?.duration_minutes || 0,
          service_price: booking.services?.price || 0,
          employee_name: booking.employees?.name || '',
          bed_name: booking.beds?.name || '',
          branch_name: booking.branches?.name || '',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          total_price: booking.total_price,
          num_guests: booking.num_guests,
          notes: booking.notes
        }
      };

      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log(`✅ Webhook fired: ${webhook.name} → ${event}`);
      } catch (err) {
        console.error(`❌ Webhook failed: ${webhook.name} → ${err.message}`);
      }
    }
  }
}

module.exports = router;