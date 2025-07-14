import React, { useState } from 'react';
export const WaitlistForm = () => {
  const [email, setEmail] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Email submitted:', email);
    alert('Thank you for joining our waitlist!');
    setEmail('');
  };
  return <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required className="flex-grow px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black" />
        <button type="submit" className="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors">
          Join Waitlist
        </button>
      </form>
    </div>;
};