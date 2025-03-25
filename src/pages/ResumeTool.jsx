import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Set up Gemini AI with our API key
const genAI = new GoogleGenerativeAI('AIzaSyDb9ybG5WizN4n1ZEl8q0FFpQBxCvJW2GA');

const ResumeTool = () => {
  // Get the current user from our auth context
  const { user } = useAuth();

  // Keep track of what the user is typing
  const [formData, setFormData] = useState({
    resumeText: '',
    jobDescription: ''
  });

  // Store the AI-tailored resume
  const [tailoredResume, setTailoredResume] = useState('');

  // Keep track of all previous resumes
  const [previousResumes, setPreviousResumes] = useState([]);

  // Loading states for better user experience
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  // Load saved resumes when the page loads
  useEffect(() => {
    if (user) {
      loadPreviousResumes();
    }
  }, [user]);

  // Update form fields as user types
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Load all saved resumes from both Firestore and local storage
  const loadPreviousResumes = async () => {
    try {
      // Get resumes from Firestore
      const resumesQuery = query(
        collection(db, 'resumes'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(resumesQuery);
      const firestoreResumes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get resumes from local storage as backup
      const localResumes = JSON.parse(localStorage.getItem(`resumes_${user.uid}`)) || [];

      // Combine and sort all resumes by date
      const allResumes = [...firestoreResumes, ...localResumes]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Remove any duplicate resumes
      const uniqueResumes = allResumes.filter((resume, index, self) =>
        index === self.findIndex((r) => r.id === resume.id)
      );

      // Update state and save to local storage
      setPreviousResumes(uniqueResumes);
      localStorage.setItem(`resumes_${user.uid}`, JSON.stringify(uniqueResumes));
    } catch (error) {
      console.error('Error loading resumes:', error);
      toast.error('Failed to load previous resumes');
    }
  };

  // Use Gemini AI to tailor the resume
  const tailorResume = async (resumeText, jobDescription) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
    
    const prompt = `You are an expert resume tailoring AI assistant. Analyze this resume and job description, then provide a tailored version that better matches the job requirements.

Important:
1. Keep the exact same format and structure
2. Maintain all section headers and their order
3. Only modify content to better match requirements
4. Use relevant keywords from the job description
5. Keep all contact and education details unchanged
6. Preserve any special formatting or symbols

Job Description:
${jobDescription}

Resume:
${resumeText}`;

    const result = await model.startChat({
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      }
    }).sendMessage(prompt);

    return result.response.text();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { resumeText, jobDescription } = formData;

    if (!resumeText || !jobDescription) {
      toast.error('Please provide both resume and job description');
      return;
    }

    try {
      setIsLoading(true);
      setProgress(25);
      setStatus('Analyzing resume...');

      // Get AI-tailored version
      const tailoredText = await tailorResume(resumeText, jobDescription);
      setProgress(75);
      setStatus('Saving results...');

      // Create new resume object
      const newResume = {
        id: Date.now().toString(),
        userId: user?.uid,
        originalText: resumeText,
        tailoredText,
        jobDescription,
        createdAt: new Date().toISOString()
      };

      // Update UI and save to storage
      setPreviousResumes(prev => [newResume, ...prev]);
      setTailoredResume(tailoredText);
      
      if (user) {
        await addDoc(collection(db, 'resumes'), newResume);
        localStorage.setItem(`resumes_${user.uid}`, JSON.stringify([newResume, ...previousResumes]));
      }

      setProgress(100);
      toast.success('Resume tailored successfully');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to tailor resume');
    } finally {
      setIsLoading(false);
      setProgress(0);
      setStatus('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Resume Tailoring Tool
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Paste your resume text and job description to get a tailored version that matches the job requirements.
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resume Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Resume Text
            </label>
            <textarea
              name="resumeText"
              value={formData.resumeText}
              onChange={handleInputChange}
              placeholder="Paste your resume text here..."
              className="w-full h-96 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Job Description Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Job Description
            </label>
            <textarea
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleInputChange}
              placeholder="Paste the job description here..."
              className="w-full h-96 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isLoading || !formData.resumeText}
            className={`btn btn-primary px-8 py-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Tailoring Resume...' : 'Tailor Resume'}
          </button>
        </div>

        {/* Progress Bar */}
        {isLoading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-gray-600 mt-2">{status}</p>
          </div>
        )}

        {/* Tailored Result */}
        {tailoredResume && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tailored Resume</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <pre className="whitespace-pre-wrap text-sm font-mono">{tailoredResume}</pre>
            </div>
          </div>
        )}
      </form>

      {/* Previous Resumes */}
      {previousResumes.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Previous Resumes</h2>
          <div className="space-y-4">
            {previousResumes.map((resume) => (
              <div key={resume.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-500">
                    Created on {new Date(resume.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <details className="cursor-pointer">
                  <summary className="text-blue-600 hover:text-blue-800">
                    View Resume Text
                  </summary>
                  <div className="mt-2">
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                      {resume.tailoredText}
                    </pre>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeTool; 