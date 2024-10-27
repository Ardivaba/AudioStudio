module.exports = {
    content: [
        "./web/**/*.{html,js,vue}"
    ],
    plugins: [
        require("@tailwindcss/typography"),
        require("daisyui")
    ],
    daisyui: {
        themes: ['emerald', 'light', 'dark', 'cupcake', 'bumblebee', 'corporate', 'synthwave', 'retro', 'cyberpunk', 'valentine'],
    },
};
