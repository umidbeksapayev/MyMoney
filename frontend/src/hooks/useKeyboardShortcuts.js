// Keyboard Shortcuts Hook
// Add keyboard navigation for power users

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = (handlers = {}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        // Allow Esc to close/blur
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      // Global shortcuts
      switch (e.key.toLowerCase()) {
        case 'n':
          if (!e.ctrlKey && !e.metaKey) {
            handlers.onNew?.();
          }
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) {
            handlers.onRecurring?.();
          }
          break;
        case 'g':
          if (!e.ctrlKey && !e.metaKey) {
            handlers.onGoal?.();
          }
          break;
        case 'b':
          if (!e.ctrlKey && !e.metaKey) {
            handlers.onBudget?.();
          }
          break;
        case '/':
          e.preventDefault();
          handlers.onSearch?.();
          break;
        case '?':
          handlers.onHelp?.();
          break;
        case 'escape':
          handlers.onClose?.();
          break;
        // Navigation shortcuts with Alt key
        case '1':
          if (e.altKey) {
            e.preventDefault();
            navigate('/dashboard');
          }
          break;
        case '2':
          if (e.altKey) {
            e.preventDefault();
            navigate('/transactions');
          }
          break;
        case '3':
          if (e.altKey) {
            e.preventDefault();
            navigate('/goals');
          }
          break;
        case '4':
          if (e.altKey) {
            e.preventDefault();
            navigate('/budgets');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handlers, navigate]);
};

// Keyboard shortcuts reference
export const KEYBOARD_SHORTCUTS = [
  { key: 'N', description: 'Add new transaction' },
  { key: 'R', description: 'Add recurring transaction' },
  { key: 'G', description: 'Add new goal' },
  { key: 'B', description: 'Add new budget' },
  { key: '/', description: 'Focus search' },
  { key: 'Esc', description: 'Close modal or blur input' },
  { key: 'Alt + 1', description: 'Go to Dashboard' },
  { key: 'Alt + 2', description: 'Go to Transactions' },
  { key: 'Alt + 3', description: 'Go to Goals' },
  { key: 'Alt + 4', description: 'Go to Budgets' },
  { key: '?', description: 'Show shortcuts help' },
];

