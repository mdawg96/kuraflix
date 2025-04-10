import { auth, db, app } from './config';
import { collection, getDocs, addDoc } from 'firebase/firestore';

/**
 * Debug utility to test Firestore connection
 */
export const debugFirestore = async () => {
  try {
    console.log('Starting Firestore debugging...');
    
    // Check configuration
    console.log('App configuration:', {
      projectId: app.options.projectId,
      databaseId: `projects/${app.options.projectId}/databases/(default)`
    });
    
    // Check authentication
    console.log('Auth state:', {
      currentUser: auth.currentUser,
      authenticated: !!auth.currentUser,
      uid: auth.currentUser?.uid
    });
    
    // Try a basic query to verify connectivity using test_collection
    console.log('Attempting to query Firestore using test_collection...');
    try {
      // Try to list all test documents with public access
      const snapshot = await getDocs(collection(db, 'test_collection'));
      console.log('Test query successful! Found', snapshot.size, 'documents');
      
      // If no docs exist, create a test document
      if (snapshot.size === 0) {
        console.log('Creating a test document...');
        const docRef = await addDoc(collection(db, 'test_collection'), {
          message: 'Test document',
          timestamp: new Date().toISOString(),
          uid: auth.currentUser?.uid || 'anonymous',
          testType: 'debug tool'
        });
        console.log('Test document created with ID:', docRef.id);
      }
      
      // Check if we've received data
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Test documents preview:', docs.length > 0 ? docs[0] : 'No documents found');
      
      return {
        success: true,
        authenticated: !!auth.currentUser,
        docsFound: snapshot.size,
        projectId: app.options.projectId
      };
    } catch (queryError) {
      console.error('Firestore test query failed:', queryError);
      
      return {
        success: false,
        error: queryError.message,
        code: queryError.code,
        authenticated: !!auth.currentUser,
        projectId: app.options.projectId
      };
    }
  } catch (error) {
    console.error('Firestore debug failed:', error);
    return {
      success: false,
      error: error.message,
      authenticated: !!auth.currentUser
    };
  }
};

// Export additional debug utilities as needed 