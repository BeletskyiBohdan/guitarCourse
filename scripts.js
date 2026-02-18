// Функція для плавного скролу до елементів на сторінці
document.querySelectorAll('.cta').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        document.querySelector(targetId).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Функціонал для випадаючих списків (акордеон)
document.querySelectorAll('.accordion-button').forEach(button => {
    button.addEventListener('click', () => {
        const content = button.nextElementSibling;

        if (button.classList.contains('active')) {
            content.classList.remove('slideDown');
            content.classList.add('slideUp');
            
            setTimeout(() => {
                content.style.display = 'none';
                button.classList.remove('active');
            }, 500); // Час має збігатися з тривалістю анімації
        } else {
            content.classList.remove('slideUp');
            content.classList.add('slideDown');
            content.style.display = 'block';
            button.classList.add('active');
        }
    });
});
