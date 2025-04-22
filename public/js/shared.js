$(function() {
    const VERSION_NUMBER = '1.1'
    let theme = $('body').attr('data-bs-theme') || 'dark' // Default theme

    // Function to get theme from cookies
    function getCookie(name) {
        let match = document.cookie.match(new RegExp('(^| )' + name + '=([^]+)'))
        return match ? match[2] : null
    }

    // Apply the saved theme when the page loads
    let savedTheme = getCookie('theme')
    if (savedTheme) {
        $('body').attr('data-bs-theme', savedTheme)
        theme = savedTheme
        $('#theme-toggle').text(savedTheme === 'dark' ? '🌙' : '☀️')

        if (savedTheme === 'dark') {
            $('body').removeClass('lightmode-bg').addClass('darkmode-bg')
            $('.bg-white').removeClass('bg-white').addClass('bg-dark')
            $('.border-dark').removeClass('border-dark').addClass('border-white')
        } else {
            $('body').removeClass('darkmode-bg').addClass('lightmode-bg')
            $('.bg-dark').removeClass('bg-dark').addClass('bg-white')
            $('.border-white').removeClass('border-white').addClass('border-dark')
        }
    }

    function themeToggle() {
        if ($('body').attr('data-bs-theme') === 'dark') {
            theme = 'light'
            $('#theme-toggle').text('☀️')
            $('body').attr('data-bs-theme', 'light')
            $('body').removeClass('darkmode-bg').addClass('lightmode-bg')
            $('.bg-dark').removeClass('bg-dark').addClass('bg-white')
            $('.border-white').removeClass('border-white').addClass('border-dark')
        } else {
            theme = 'dark'
            $('#theme-toggle').text('🌙')
            $('body').attr('data-bs-theme', 'dark')
            $('body').removeClass('lightmode-bg').addClass('darkmode-bg')
            $('.bg-white').removeClass('bg-white').addClass('bg-dark')
            $('.border-dark').removeClass('border-dark').addClass('border-white')
        }
    }

    // Update site version globally
    $("#version").text(VERSION_NUMBER)

    // Highlight main navigation links
    let currentPath = window.location.pathname
    $(".nav-link").each(function() {
        if ($(this).attr("href") === currentPath) {
            $(this).addClass("active").attr("aria-current", "page")
        }
    })

    // Highlight dropdown items
    $(".dropdown-item").each(function() {
        if ($(this).attr("href") === currentPath) {
            $(this).addClass("active").attr("aria-current", "page")
            $(this).closest(".dropdown").find(".nav-link").addClass("active")
        }
    })

    // Theme toggle button event
    $('#theme-toggle').click(function() {
        themeToggle()

        // Send theme update to server
        $.post('/save-theme', { theme: theme }, function(response) {
            console.log(response.message) // Log server response
        })

        // Store theme in a cookie for guests
        document.cookie = `theme=${theme} path=/ max-age=2592000` // 30 days
    })
})
