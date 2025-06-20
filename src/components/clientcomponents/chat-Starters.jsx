import React from 'react';

const ChatStarters = ({ onStarterClick }) => {
  const chatStarters = [
    {
      id: 'equal-split',
      text: 'Can you divide the bill equally?',
      icon: '⚖️'
    },
    {
      id: 'move-all-items',
      text: 'Can you move all items from Alice to Bob?',
      icon: '📋'
    },
    {
      id: 'move-single-item',
      text: 'Can you move item 1 from Alice to Bob?',
      icon: '🔄'
    },
    {
      id: 'custom-split',
      text: 'I want to split by percentage',
      icon: '📊'
    },
    {
      id: 'exclude-person',
      text: 'Can you exclude someone from certain items?',
      icon: '❌'
    },
    {
      id: 'add-tip',
      text: 'Add 10% service charge to the bill',
      icon: '💰'
    }
  ];

  return (
    <div className="chat-starters">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        Quick Actions for TANG FEI DESSERT SEAPARK (MYR 22.90)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {chatStarters.map((starter) => (
          <button
            key={starter.id}
            onClick={() => onStarterClick(starter.text)}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
          >
            <span className="text-xl">{starter.icon}</span>
            <span className="text-sm text-gray-700">{starter.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatStarters;