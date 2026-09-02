import React from 'react';

export default function Toast({ message, isVisible }) {
  return (
    <div id="toast" role="status" className={isVisible ? 'show' : ''}>
      {message}
    </div>
  );
}




