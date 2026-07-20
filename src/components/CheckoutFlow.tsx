import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, CheckCircle2 } from 'lucide-react';
import { AddressBook, type Address } from './AddressBook';
import { type Book, formatMonthYear } from '../lib/data';
import './CheckoutFlow.css';

interface CheckoutFlowProps {
  book: Book;
  onClose: () => void;
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ book, onClose }) => {
  const [step, setStep] = useState<'summary' | 'address_picker' | 'success'>('summary');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const handleCheckout = () => {
    setStep('success');
  };

  return (
    <motion.div 
      className="checkout-wrap"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
    >
      {step === 'summary' && (
        <>
          <div className="checkout-header">
            <button className="checkout-back" onClick={onClose}>
              <ChevronLeft size={24} />
            </button>
            <h2 className="checkout-title">Order Book</h2>
            <div style={{ width: 24 }} />
          </div>

          <div className="checkout-body">
            <div className="order-summary-card">
              <div className="order-book-preview">
                <div className="order-book-cover">
                  <span className="order-book-month">{formatMonthYear(book.monthKey)}</span>
                </div>
              </div>
              <div className="order-details">
                <h3>{formatMonthYear(book.monthKey)} Edition</h3>
                <p>{book.days.length} pages · Premium Layflat</p>
                <span className="order-price">$39.00</span>
              </div>
            </div>

            <div className="checkout-section">
              <h3>Shipping to</h3>
              {selectedAddress ? (
                <div className="checkout-address-card" onClick={() => setStep('address_picker')}>
                  <div className="address-info">
                    <span className="addr-name">{selectedAddress.name}</span>
                    <span className="addr-text">{selectedAddress.street}</span>
                    <span className="addr-text">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}</span>
                  </div>
                  <button className="change-btn">Change</button>
                </div>
              ) : (
                <button className="add-address-btn" onClick={() => setStep('address_picker')}>
                  <MapPin size={20} />
                  <span>Select Shipping Address</span>
                </button>
              )}
            </div>
            
            <div className="checkout-section">
              <h3>Payment</h3>
              <div className="payment-mock">
                <span>Apple Pay</span>
              </div>
            </div>
          </div>

          <div className="checkout-footer">
            <button 
              className="checkout-btn-primary" 
              disabled={!selectedAddress}
              onClick={handleCheckout}
            >
              Place Order • $39.00
            </button>
          </div>
        </>
      )}

      {step === 'address_picker' && (
        <AddressBook 
          isPickerMode={true} 
          onBack={() => setStep('summary')} 
          onSelect={(addr) => {
            setSelectedAddress(addr);
            setStep('summary');
          }}
        />
      )}

      {step === 'success' && (
        <motion.div 
          className="checkout-success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <CheckCircle2 size={64} color="var(--accent)" />
          </motion.div>
          <h2>Order Confirmed!</h2>
          <p>Your book for {formatMonthYear(book.monthKey)} is off to the printers. We'll let you know when it ships.</p>
          <button className="checkout-btn-primary" onClick={onClose} style={{ marginTop: 32 }}>
            Done
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};
