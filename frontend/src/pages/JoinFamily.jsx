import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Users, Check, Loader2, AlertCircle } from 'lucide-react';

export default function JoinFamily() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [familyInfo, setFamilyInfo] = useState(null);

  const handleJoin = useCallback(async (code) => {
    try {
      console.log('Attempting to join family with code:', code);
      setLoading(true);
      setError(null);
      
      const response = await api.post('/families/join', { code: code.trim().toUpperCase() });
      
      console.log('Join response:', response.data);
      setFamilyInfo(response.data.family);
      toast.success(response.data.message || 'Successfully joined family!');
      
      // Redirect to family page after 2 seconds
      setTimeout(() => {
        navigate('/family');
      }, 2000);
    } catch (err) {
      console.error('Error joining family:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMsg = err.response?.data?.error || 'Failed to join family';
      
      if (err.response?.status === 404) {
        setError('Invalid or expired invite code. Please check the code and try again.');
      } else if (err.response?.status === 400) {
        setError(errorMsg);
      } else if (err.response?.status === 403 || err.response?.status === 401) {
        setError('Authentication error. Please log in first.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(errorMsg);
      }
      
      toast.error(errorMsg);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const code = searchParams.get('code');
    
    console.log('JoinFamily loaded, code from URL:', code);
    
    if (!code) {
      setError('No invite code provided in URL');
      setLoading(false);
      return;
    }

    // Auto-join with the code
    handleJoin(code);
  }, [searchParams, handleJoin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
            Joining Family...
          </h2>
          <p style={{ color: '#6b7280' }}>
            Please wait while we process your invite
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-md w-full mx-4">
          <div className="rounded-lg shadow-lg p-8" style={{ backgroundColor: '#ffffff' }}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#fee2e2' }}>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
                Unable to Join Family
              </h2>
              <p className="mb-4" style={{ color: '#6b7280' }}>
                {error}
              </p>
              <div className="rounded p-3 mb-6 text-sm text-left" style={{ backgroundColor: '#f3f4f6' }}>
                <p style={{ color: '#374151' }}>
                  <strong>Invite Code:</strong> {searchParams.get('code') || 'Not found'}
                </p>
                <p className="mt-2 text-xs" style={{ color: '#9ca3af' }}>
                  Check browser console (F12) for detailed error logs
                </p>
              </div>
              <button
                onClick={() => {
                  const code = searchParams.get('code');
                  if (code) {
                    handleJoin(code);
                  }
                }}
                className="w-full mb-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/family')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Families
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-md w-full mx-4">
        <div className="rounded-lg shadow-lg p-8" style={{ backgroundColor: '#ffffff' }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#d1fae5' }}>
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
              Successfully Joined!
            </h2>
            {familyInfo && (
              <p className="mb-6" style={{ color: '#6b7280' }}>
                Welcome to <span className="font-semibold">{familyInfo.name}</span>
              </p>
            )}
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
              Redirecting to family page...
            </p>
            <button
              onClick={() => navigate('/family')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Family Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

