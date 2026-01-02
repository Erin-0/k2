export const formatNeuralCurrency = (value: number): string => {
    if (value === 0) return "$0.00";
    if (value < 0) return "-$" + formatNeuralCurrency(Math.abs(value)).substring(1);

    const suffixes = [
        { value: 1e100, label: "G" }, // Googol
        { value: 1e33, label: "D" }, // Decillion
        { value: 1e30, label: "N" }, // Nonillion
        { value: 1e27, label: "O" }, // Octillion
        { value: 1e24, label: "S" }, // Septillion
        { value: 1e21, label: "s" }, // Sextillion
        { value: 1e18, label: "Q" }, // Quintillion
        { value: 1e15, label: "q" }, // Quadrillion
        { value: 1e12, label: "T" }, // Trillion
        { value: 1e9, label: "B" },  // Billion
        { value: 1e6, label: "M" },  // Million
        { value: 1e3, label: "K" }   // Thousand
    ];

    for (let i = 0; i < suffixes.length; i++) {
        if (value >= suffixes[i].value) {
            const formatted = (value / suffixes[i].value).toFixed(2);
            // Remove trailing zero if applicable
            return "$" + parseFloat(formatted).toString() + suffixes[i].label;
        }
    }

    return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
