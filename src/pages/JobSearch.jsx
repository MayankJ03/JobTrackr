import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const experienceRanges = {
  'fresher': { min: 0, max: 0, label: 'Fresher (0 years)' },
  '0-1': { min: 0, max: 1, label: '0-1 year' },
  '1-2': { min: 1, max: 2, label: '1-2 years' },
  '2-3': { min: 2, max: 3, label: '2-3 years' },
  '3-5': { min: 3, max: 5, label: '3-5 years' },
  '5-7': { min: 5, max: 7, label: '5-7 years' },
  '7-10': { min: 7, max: 10, label: '7-10 years' },
  '10+': { min: 10, max: null, label: '10+ years' }
};

const JobSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchJobs = async (e) => {
    e.preventDefault();
    if (!query) {
      toast.error('Please enter a job title');
      return;
    }

    setLoading(true);
    try {
      // Construct experience-specific search terms
      let experienceQuery = '';
      if (experience) {
        const range = experienceRanges[experience];
        if (experience === 'fresher') {
          experienceQuery = 'fresher entry level no experience';
        } else if (range.max === null) {
          experienceQuery = `${range.min}+ years experience`;
        } else {
          experienceQuery = `${range.min}-${range.max} years experience`;
        }
      }

      // Construct search query with India focus
      const searchQuery = `${query} ${location || 'India'} ${experienceQuery}`.trim();
      const response = await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&country=IN`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log

      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.data || data.data.length === 0) {
        toast.error('No jobs found. Try different search terms.');
        return;
      }

      setJobs(data.data.map(job => ({
        title: job.job_title,
        company_name: job.employer_name,
        location: job.job_city + ', ' + job.job_country,
        description: job.job_description,
        link: job.job_apply_link,
        detected_extensions: {
          schedule_type: job.job_employment_type,
          salary: job.job_min_salary ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency}` : 'Not specified'
        }
      })));
    } catch (error) {
      console.error('Job search error:', error);
      toast.error(error.message || 'Failed to fetch jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveJob = async (job) => {
    if (!user) {
      toast.error('Please log in to save jobs');
      return;
    }

    try {
      // Create saved job object with a temporary ID
      const tempId = 'temp_' + Date.now();
      const savedJob = {
        id: tempId, // Add temporary ID for local storage
        userId: user.uid,
        jobTitle: job.title,
        company: job.company_name,
        location: job.location,
        jobLink: job.link,
        createdAt: new Date().toISOString(),
        type: job.detected_extensions?.schedule_type || 'Not specified',
        salary: job.detected_extensions?.salary || 'Not specified'
      };

      // First, save to local storage
      const localSavedJobs = JSON.parse(localStorage.getItem(`saved_jobs_${user.uid}`) || '[]');
      const newLocalSavedJobs = [savedJob, ...localSavedJobs];
      localStorage.setItem(`saved_jobs_${user.uid}`, JSON.stringify(newLocalSavedJobs));

      // Try to save to Firestore in background
      try {
        const docRef = await addDoc(collection(db, 'saved_jobs'), savedJob);
        
        // Update local storage with the Firestore ID
        const updatedLocalSavedJobs = newLocalSavedJobs.map(job => 
          job.id === tempId ? { ...job, id: docRef.id } : job
        );
        localStorage.setItem(`saved_jobs_${user.uid}`, JSON.stringify(updatedLocalSavedJobs));
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError);
        // Keep the temporary ID if Firestore fails
        toast.error('Job saved locally but failed to sync with cloud');
      }

      toast.success('Job saved successfully');
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Jobs in India</h2>

          <form onSubmit={searchJobs} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Job title or keywords"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="City (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
            />
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="input-field"
            >
              <option value="">Any Experience</option>
              {Object.entries(experienceRanges).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Searching...' : 'Search Jobs'}
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-6">
              {jobs.map((job, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                      <p className="text-gray-600">{job.company_name}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-500 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.detected_extensions?.schedule_type || 'Not specified'}
                        </p>
                        {job.detected_extensions?.salary && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {job.detected_extensions.salary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Apply Now →
                      </a>
                      <button
                        onClick={() => saveJob(job)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Save Job
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-700">{job.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <p>Search for jobs to see results</p>
              <p className="text-sm mt-2">Example: "React Developer in Bangalore" or "Software Engineer"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobSearch; 