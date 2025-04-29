import React from 'react';
import { Link } from 'react-router-dom';

const ProjectSelector = ({
  projectList = [],
  onCreateNewProject,
  onLoadProject,
  onDeleteProject
}) => {
  // Deduplicate projects by ID and ensure unique display keys
  const uniqueProjects = React.useMemo(() => {
    const projectMap = new Map();
    
    // First pass - add all projects to the map by ID
    projectList.forEach(project => {
      // Skip if missing ID
      if (!project.id) {
        console.warn("Found project without ID:", project);
        return;
      }
      
      // If this ID doesn't exist in the map, or the current project is newer
      const existing = projectMap.get(project.id);
      if (!existing || (project.updatedAt && (!existing.updatedAt || new Date(project.updatedAt) > new Date(existing.updatedAt)))) {
        projectMap.set(project.id, project);
      }
    });
    
    // Convert to array and add unique display IDs for ALL projects
    return Array.from(projectMap.values());
  }, [projectList]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Manga Studio</h1>
          <p className="text-gray-400 mt-1">Create or select a manga project to get started</p>
        </div>
      </div>

      {/* Create New Project Card */}
      <div
        className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg mb-8 hover:border-anime-indigo transition-all duration-200 cursor-pointer"
        onClick={onCreateNewProject}
      >
        <div className="flex items-center justify-center h-40 bg-gradient-to-r from-anime-indigo to-anime-pink rounded-lg mb-4">
          <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Create New Project</h2>
        <p className="text-gray-400">Start a fresh manga with a blank canvas</p>
      </div>

      {/* Recent Projects Section */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Projects</h2>
        {uniqueProjects.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400">You don't have any projects yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueProjects.map((project) => (
              <div
                key={`project-${project.id}`}
                className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden hover:border-anime-indigo transition-all duration-200 cursor-pointer"
                onClick={() => project && project.id && onLoadProject(project)}
              >
                <div className="relative h-40 bg-gray-700">
                  <img
                    src={project.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMjgwIiB2aWV3Qm94PSIwIDAgNTAwIDI4MCI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSIyODAiIGZpbGw9IiMxZTI5M2IiLz48dGV4dCB4PSIyNTAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjM2IiBmaWxsPSIjZDFkNWRiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+UHJvamVjdDwv dGV4dD48L3N2Zz4='} // Add fallback image
                    alt={project.title}
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMjgwIiB2aWV3Qm94PSIwIDAgNTAwIDI4MCI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSIyODAiIGZpbGw9IiMxZTI5M2IiLz48dGV4dCB4PSIyNTAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjM2IiBmaWxsPSIjZDFkNWRiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+UHJvamVjdDwv dGV4dD48L3N2Zz4='} // Add fallback image onError
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent py-2 px-3">
                    <span className="text-white font-bold">{project.title || 'Untitled Project'}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>{project.author || 'Anonymous'}</span>
                    <span>{project.pages || 0} pages</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    Last edited: {project.lastEdited || (project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Unknown')}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteProject && project && project.id) onDeleteProject(project, e);
                    }}
                    className="w-full mt-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors duration-200"
                    title="Delete project"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSelector;