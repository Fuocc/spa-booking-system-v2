const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET all customers
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,phone.ilike.%${req.query.search}%,id.ilike.%${req.query.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET customer by id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, habits } = req.body;
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, phone, email, habits: habits || null }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, habits } = req.body;
    const { data, error } = await supabase
      .from('customers')
      .update({ name, phone, email, habits: habits || null })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    // 1. Check if customer has bookings
    const { count, error: countErr } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', req.params.id);

    if (countErr) throw countErr;

    if (count > 0) {
      return res.status(400).json({ 
        error: 'Không thể xóa khách hàng này vì đã có lịch sử đặt lịch. Vui lòng xóa các lịch hẹn liên quan trước.' 
      });
    }

    // 2. Delete customer if no bookings
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;