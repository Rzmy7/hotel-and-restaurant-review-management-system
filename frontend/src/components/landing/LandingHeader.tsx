import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Menu, X, Star } from 'lucide-react';
import { cn } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  const { user } = useAuth();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 backdrop-blur-md shadow-sm dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 py-3'
          : 'bg-transparent py-5'
      )}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Star className="text-white h-6 w-6 fill-current" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            ReviewMaster<span className="text-blue-600">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              {link.name}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <Link to="/dashboard">
              <Button variant="primary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-gray-600 dark:text-gray-300"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 animate-fadeIn">
          <nav className="flex flex-col p-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-base font-medium text-gray-600 dark:text-gray-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <hr className="border-gray-100 dark:border-slate-800" />
            <div className="flex flex-col space-y-3">
              {user ? (
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
