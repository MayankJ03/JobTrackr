import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const ApplicationTracker = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newApplication, setNewApplication] = useState({
    company: '',
    position: '',
    location: '',
    status: 'Applied',
    dateApplied: new Date().toISOString().split('T')[0],
    notes: '',
    jobLink: ''
  });

  // Get applications from local storage
  const getLocalApplications = () => {
    const localData = localStorage.getItem(`applications_${user.uid}`);
    return localData ? JSON.parse(localData) : [];
  };

  // Save applications to local storage
  const saveLocalApplications = (apps) => {
    localStorage.setItem(`applications_${user.uid}`, JSON.stringify(apps));
  };

  // Sync with Firestore
  const syncWithFirestore = async () => {
    try {
      console.log('Starting Firestore sync...');
      const q = query(
        collection(db, 'applications'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const firestoreApps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Fetched applications from Firestore:', firestoreApps);

      // Only update if there are actual changes
      const localApps = getLocalApplications();
      console.log('Current local applications:', localApps);
      
      if (JSON.stringify(firestoreApps) !== JSON.stringify(localApps)) {
        console.log('Updating local storage with Firestore data');
        saveLocalApplications(firestoreApps);
        setApplications(firestoreApps);
      } else {
        console.log('No changes detected, skipping update');
      }
    } catch (error) {
      console.error('Error syncing with Firestore:', error);
      // If sync fails, still show local data
      const localApps = getLocalApplications();
      console.log('Using local data due to sync error:', localApps);
      setApplications(localApps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // First load from local storage
      const localApps = getLocalApplications();
      setApplications(localApps);
      setLoading(false);
      
      // Then sync with Firestore
      syncWithFirestore();
    }
  }, [user]);

  const handleAddApplication = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to add applications');
      return;
    }

    try {
      // Create application object
      const application = {
        userId: user.uid,
        jobTitle: newApplication.position,
        company: newApplication.company,
        location: newApplication.location,
        jobLink: newApplication.jobLink,
        status: newApplication.status,
        dateApplied: newApplication.dateApplied,
        notes: newApplication.notes,
        createdAt: new Date().toISOString()
      };

      // First, save to local storage
      const localApps = getLocalApplications();
      const newLocalApps = [application, ...localApps];
      saveLocalApplications(newLocalApps);
      setApplications(newLocalApps);

      // Then save to Firestore in background
      const docRef = await addDoc(collection(db, 'applications'), application);
      
      // Update local storage with the Firestore ID
      application.id = docRef.id;
      const updatedLocalApps = [application, ...localApps];
      saveLocalApplications(updatedLocalApps);
      setApplications(updatedLocalApps);

      // Reset form
      setNewApplication({
        company: '',
        position: '',
        location: '',
        status: 'Applied',
        dateApplied: new Date().toISOString().split('T')[0],
        notes: '',
        jobLink: ''
      });

      toast.success('Application added successfully');
    } catch (error) {
      console.error('Error adding application:', error);
      toast.error('Failed to save to cloud, but it\'s saved locally');
    }
  };

  const updateStatus = async (applicationId, newStatus) => {
    try {
      // Find the application first
      const application = applications.find(app => app.id === applicationId);
      if (!application) {
        toast.error('Application not found');
        return;
      }

      // Update local state and storage immediately
      const updatedApplications = applications.map(app =>
        app.id === applicationId ? { ...app, status: newStatus } : app
      );
      setApplications(updatedApplications);
      saveLocalApplications(updatedApplications);

      // Update Firestore in background
      await updateDoc(doc(db, 'applications', applicationId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status in cloud');
      // Note: Local changes are kept even if cloud sync fails
    }
  };

  const deleteApplication = async (applicationId) => {
    try {
      // Update local state and storage immediately
      const updatedApplications = applications.filter(app => app.id !== applicationId);
      setApplications(updatedApplications);
      saveLocalApplications(updatedApplications);

      // Delete from Firestore in background
      await deleteDoc(doc(db, 'applications', applicationId));
      toast.success('Application removed successfully');
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Failed to remove from cloud');
      // Note: Local changes are kept even if cloud sync fails
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Saved': 'bg-gray-100 text-gray-800',
      'Applied': 'bg-blue-100 text-blue-800',
      'Interviewing': 'bg-yellow-100 text-yellow-800',
      'Offered': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Not Interested': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Tracker</h2>

          {/* Add Application Form */}
          <form onSubmit={handleAddApplication} className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Company Name"
              value={newApplication.company}
              onChange={(e) => setNewApplication({ ...newApplication, company: e.target.value })}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Position"
              value={newApplication.position}
              onChange={(e) => setNewApplication({ ...newApplication, position: e.target.value })}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Location"
              value={newApplication.location}
              onChange={(e) => setNewApplication({ ...newApplication, location: e.target.value })}
              className="input-field"
            />
            <input
              type="date"
              value={newApplication.dateApplied}
              onChange={(e) => setNewApplication({ ...newApplication, dateApplied: e.target.value })}
              className="input-field"
              required
            />
            <select
              value={newApplication.status}
              onChange={(e) => setNewApplication({ ...newApplication, status: e.target.value })}
              className="input-field"
            >
              <option value="Saved">Saved</option>
              <option value="Applied">Applied</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Offered">Offered</option>
              <option value="Rejected">Rejected</option>
              <option value="Not Interested">Not Interested</option>
            </select>
            <input
              type="url"
              placeholder="Job Link (optional)"
              value={newApplication.jobLink}
              onChange={(e) => setNewApplication({ ...newApplication, jobLink: e.target.value })}
              className="input-field"
            />
            <textarea
              placeholder="Notes (optional)"
              value={newApplication.notes}
              onChange={(e) => setNewApplication({ ...newApplication, notes: e.target.value })}
              className="input-field col-span-full"
              rows="2"
            />
            <button
              type="submit"
              className="btn-primary col-span-full"
            >
              Add Application
            </button>
          </form>

          {/* Applications List */}
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No job applications yet. Add your first application above or save jobs from the job search!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {applications.map((application) => (
                <div key={application.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.jobTitle}
                      </h3>
                      <p className="text-gray-600">{application.company}</p>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-gray-500 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {application.location}
                        </p>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {application.status}
                          </span>
                          <select
                            value={application.status}
                            onChange={(e) => updateStatus(application.id, e.target.value)}
                            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="Saved">Saved</option>
                            <option value="Applied">Applied</option>
                            <option value="Interviewing">Interviewing</option>
                            <option value="Offered">Offered</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Not Interested">Not Interested</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {application.jobLink && (
                        <a
                          href={application.jobLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Job →
                        </a>
                      )}
                      <button
                        onClick={() => deleteApplication(application.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {application.notes && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">{application.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationTracker; 