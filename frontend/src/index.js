import React from 'react';
import ReactDOM from 'react-dom';
import { register } from './serviceWorker';

function App() {
  return (
    <div>
      <h1>AI-Driven Census PWA</h1>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
register();