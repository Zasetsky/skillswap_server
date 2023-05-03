function calculateAverageOnlineTime(onlineSessions) {
    let totalTime = 0;
    let completedSessions = 0;
  
    onlineSessions.forEach((session) => {
      if (session.sessionStart && session.sessionEnd) {
        totalTime += session.sessionEnd - session.sessionStart;
        completedSessions++;
      }
    });
  
    if (completedSessions === 0) {
      return 0;
    }
  
    return totalTime / completedSessions;
}

module.exports = calculateAverageOnlineTime;