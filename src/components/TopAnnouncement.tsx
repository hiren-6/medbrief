import React from 'react';
import { Megaphone } from 'lucide-react';

type TopAnnouncementProps = {
  message?: string;
};

const TopAnnouncement: React.FC<TopAnnouncementProps> = ({
  message = 'Launching soon! Stay tuned for updates.'
}) => {
  return (
    <div className="w-full bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-b border-amber-200" role="status" aria-live="polite">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center gap-2 py-2 text-amber-900 text-sm">
          <Megaphone className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <span className="font-medium">{message}</span>
        </div>
      </div>
      <div className="h-0.5 bg-amber-200" />
    </div>
  );
};

export default TopAnnouncement;


