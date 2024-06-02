import { Date as DateJS } from 'datejs';

export const disableTomorrow = (current) => {
    // Disable tomorrow
    const today = new DateJS();
    const tomorrow = today.add(1).days().clearTime();
    return current && current.isSameDay(tomorrow);
  };
