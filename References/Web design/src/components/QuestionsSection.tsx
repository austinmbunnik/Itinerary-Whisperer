import { HelpCircleIcon } from 'lucide-react';
export const QuestionsSection = () => {
  const questions = ['What destinations are you interested in visiting?', 'How many days do you plan to spend in each location?', "What's your budget for this trip?", 'What activities or attractions are must-sees for your group?', 'Do you prefer hotels, vacation rentals, or a mix?', 'How will you get around? (Rental car, public transport, etc.)', 'Any dietary restrictions or food preferences to consider?'];
  return <div>
      <div className="flex items-center mb-4">
        <HelpCircleIcon className="h-6 w-6 text-black mr-2" />
        <h2 className="text-2xl font-semibold">Discussion Questions</h2>
      </div>
      <p className="text-gray-700 mb-4">
        Use these questions to guide your conversation:
      </p>
      <ul className="space-y-3">
        {questions.map((question, index) => <li key={index} className="flex items-start">
            <span className="inline-block bg-black text-white rounded-full h-6 w-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
              {index + 1}
            </span>
            <span>{question}</span>
          </li>)}
      </ul>
    </div>;
};