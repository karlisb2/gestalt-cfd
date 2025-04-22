$(document).ready(function() {
    function passwordValidator() {
        var password = $('#password').val()
        var confirmPassword = $('#confirmPassword').val()

        const strengthMessage = $('#strengthMessage')
        const matchMessage = $('#matchMessage')

        strengthMessage.hide()
        matchMessage.hide()
        strengthMessage.removeClass('text-danger text-warning text-success')
        matchMessage.removeClass('text-danger text-success')

        var strength = 0

        if (password.length >= 8) strength++
        if (/[A-Z]/.test(password)) strength++
        if (/[a-z]/.test(password)) strength++
        if (/[0-9]/.test(password)) strength++
        if (/[\W_]/.test(password)) strength++
        if (/password/.test(password.toLowerCase())) strength = 0
        if (password.length > 0) strengthMessage.show()

        switch (strength) {
            case 0:
            case 1:
                strengthMessage.text('Weak password').addClass('text-danger')
                break
            case 2:
            case 3:
                strengthMessage.text('Moderate password').addClass('text-warning')
                break
            case 4:
            case 5:
                strengthMessage.text('Strong password').addClass('text-success')
                break
        }

        if (password === confirmPassword && password.length > 0) {
            matchMessage.show()
            matchMessage.text('Passwords match').addClass('text-success')
        } else if (confirmPassword.length > 0) {
            matchMessage.show()
            matchMessage.text('Passwords do not match').addClass('text-danger')
        }
    }

    function emailValidator() {
        var email = $('#email').val()
        var emailMessage = $('#emailMessage')
        emailMessage.removeClass('text-danger text-success')
        if (/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
            emailMessage.show()
            emailMessage.text('Valid email').addClass('text-success')
        } else if (email.length > 0) {
            emailMessage.show()
            emailMessage.text('Invalid email').addClass('text-danger')
        } else {
            emailMessage.hide()
        }
    }

    $('#email').on('input', function() {
        emailValidator()
    })

    $('#password').on('input', function() {
        passwordValidator()
    })

    $('#confirmPassword').on('input', function() {
        passwordValidator()
    })

    $("#register-form").on("submit", function(event) {
        passwordValidator()
        emailValidator()

        const invalidEmail = $('#emailMessage').text().includes("Invalid")
        const isWeak = $("#strengthMessage").text().includes("Weak")
        const isNotMatch = $("#matchMessage").text().includes("not match")

        if (isWeak || isNotMatch || invalidEmail) {
            event.preventDefault()
            $("#error-message").text("Ensure all credentials are valid.").addClass("text-danger").show()
        } else {
            errorMessage.hide()
        }
    })
})
