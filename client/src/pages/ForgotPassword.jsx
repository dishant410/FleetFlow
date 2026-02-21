import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { authAPI } from '../api/endpoints';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Reset link sent if email exists.');
    } catch {
      toast.error('Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <TruckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FleetFlow</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

          {sent ? (
            <div className="text-center py-4">
              <p className="text-green-600 font-medium">Check your email for reset instructions.</p>
              <Link to="/login" className="text-sm text-primary-600 hover:underline mt-4 inline-block">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
                required
              />
              <button type="submit" className="btn-primary w-full">Send Reset Link</button>
              <Link to="/login" className="block text-center text-sm text-primary-600 hover:underline">
                Back to login
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
