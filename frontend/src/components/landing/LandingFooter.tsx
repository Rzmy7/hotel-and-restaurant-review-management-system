import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin } from 'lucide-react';
import reviewMateLogo from '../../assets/reviewMate-logo.png';
export const LandingFooter = () => {
  return (
    <footer className="bg-[#FEFEFE] dark:bg-slate-900 border-t border-gray-200/60 dark:border-slate-800 py-12 md:py-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <img src={reviewMateLogo} alt="ReviewMate Logo" className="w-9 h-9 object-contain" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ReviewMate
              </span>
            </Link>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              The all-in-one AI platform to manage, analyze, and automate your online reviews across all platforms.
            </p>
            {/* Social links: added aria-label for screen readers; aria-hidden on icon SVGs to avoid duplicate announcements */}
            <div className="flex space-x-4">
              <a href="#" aria-label="Follow us on Twitter" className="text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">
                <Twitter size={20} aria-hidden="true" />
              </a>
              <a href="#" aria-label="Connect on LinkedIn" className="text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">
                <Linkedin size={20} aria-hidden="true" />
              </a>
              <a href="#" aria-label="View our GitHub" className="text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">
                <Github size={20} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
          {/* Heading order fix: changed h4 → h3 (page has h2 section headings; skipping to h4 violates WCAG heading order) */}
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">Product</h3>
            <ul className="space-y-4">
              <li><a href="#features" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">How It Works</a></li>
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Integrations</a></li>
            </ul>
          </div>

          <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">Company</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">About Us</a></li>
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Press</a></li>
            </ul>
          </div>

          <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">Legal</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#4E80EE] dark:hover:text-[#4E80EE] transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 md:mb-0">
            © {new Date().getFullYear()} ReviewMate. All rights reserved.
          </p>
          <div className="flex space-x-6">
            {/* Changed text-gray-400/text-gray-500 to text-gray-600/text-gray-400 for sufficient contrast on white/dark backgrounds */}
            <span className="text-xs text-gray-600 dark:text-gray-400">Built with React &amp; Tailwind</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
