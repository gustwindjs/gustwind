function init() {
  function dateToISO(date: string) {
    return (new Date(date)).toISOString();
  }

  return { dateToISO };
}

export { init };
