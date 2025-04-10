import React from 'react';

const DeleteConfirmationModal = ({ project, onConfirm, onCancel }) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-11/12 max-w-md border-2 border-red-500/30 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Delete Project</h2>
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete "<span className="text-white font-semibold">{project.title}</span>"? 
          This action cannot be undone.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-300"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-300"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal; 