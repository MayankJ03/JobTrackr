import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const SavedJobs = () => {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get saved jobs from local storage
  const getLocalSavedJobs = () => {
    const localData = localStorage.getItem(`saved_jobs_${user.uid}`);
    return localData ? JSON.parse(localData) : [];
  };

  // Save jobs to local storage
  const saveLocalSavedJobs = (jobs) => {
    localStorage.setItem(`saved_jobs_${user.uid}`, JSON.stringify(jobs));
  };

  // Sync with Firestore
  const syncWithFirestore = async () => {
    try {
      const q = query(
        collection(db, 'saved_jobs'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const firestoreJobs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Only update if there are actual changes
      const localJobs = getLocalSavedJobs();
      if (JSON.stringify(firestoreJobs) !== JSON.stringify(localJobs)) {
        saveLocalSavedJobs(firestoreJobs);
        setSavedJobs(firestoreJobs);
      }
    } catch (error) {
      console.error('Error syncing with Firestore:', error);
      // If sync fails, still show local data
      const localJobs = getLocalSavedJobs();
      setSavedJobs(localJobs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // First load from local storage
      const localJobs = getLocalSavedJobs();
      setSavedJobs(localJobs);
      setLoading(false);
      
      // Then sync with Firestore
      syncWithFirestore();
    }
  }, [user]);

  const moveToApplications = async (job) => {
    if (!user) {
      toast.error('Please log in to move jobs to applications');
      return;
    }

    try {
      console.log('Starting to move job to applications:', job);
      
      // Create application object
      const application = {
        userId: user.uid,
        jobTitle: job.jobTitle,
        company: job.company,
        location: job.location,
        jobLink: job.jobLink,
        status: 'Applied',
        createdAt: new Date().toISOString(),
        notes: '',
        type: job.type || 'Not specified',
        salary: job.salary || 'Not specified'
      };

      console.log('Created application object:', application);

      // First, add to applications collection
      const docRef = await addDoc(collection(db, 'applications'), application);
      console.log('Added to applications:', docRef.id);

      // Update local storage for applications
      const localApps = JSON.parse(localStorage.getItem(`applications_${user.uid}`) || '[]');
      const newLocalApps = [{ ...application, id: docRef.id }, ...localApps];
      localStorage.setItem(`applications_${user.uid}`, JSON.stringify(newLocalApps));
      console.log('Updated local applications storage');

      // Then, remove from saved jobs
      const updatedJobs = savedJobs.filter(j => j.id !== job.id);
      setSavedJobs(updatedJobs);
      saveLocalSavedJobs(updatedJobs);
      console.log('Updated saved jobs state and storage');

      // Delete from Firestore saved jobs
      await deleteDoc(doc(db, 'saved_jobs', job.id));
      console.log('Deleted from saved jobs in Firestore');

      toast.success('Job moved to applications successfully');
    } catch (error) {
      console.error('Error moving job:', error);
      toast.error('Failed to move job to applications');
    }
  };

  const deleteSavedJob = async (jobId) => {
    try {
      // Update local state and storage immediately
      const updatedJobs = savedJobs.filter(job => job.id !== jobId);
      setSavedJobs(updatedJobs);
      saveLocalSavedJobs(updatedJobs);

      // Delete from Firestore in background
      await deleteDoc(doc(db, 'saved_jobs', jobId));
      toast.success('Job removed from saved jobs');
    } catch (error) {
      console.error('Error deleting saved job:', error);
      toast.error('Failed to remove from cloud');
      // Note: Local changes are kept even if cloud sync fails
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Jobs</h2>

          {savedJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No saved jobs yet. Save jobs from the job search to see them here!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {savedJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.jobTitle}
                      </h3>
                      <p className="text-gray-600">{job.company}</p>
                      <div className="mt-2 space-y-2">
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
                          {job.type}
                        </p>
                        {job.salary && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {job.salary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <a
                        href={job.jobLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Job →
                      </a>
                      <button
                        onClick={() => moveToApplications(job)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Move to Applications
                      </button>
                      <button
                        onClick={() => deleteSavedJob(job.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedJobs; 