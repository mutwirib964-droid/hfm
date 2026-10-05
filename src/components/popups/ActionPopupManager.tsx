import React from 'react';
import { ActionPopup } from '../../types';

interface ActionPopupManagerProps {
  currentPopup: ActionPopup | null;
  onDismiss: () => void;
  isDarkMode?: boolean;
}

export const ActionPopupManager: React.FC<ActionPopupManagerProps> = () => {
  return null;
};
