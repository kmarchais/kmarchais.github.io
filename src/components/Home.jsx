import { About, Contact, Experience, Hero, Navbar, Tech, Works } from './'


const Home = () => {

    return (
        <div className="relative z-0 bg-primary">
            <div className="bg-hero-pattern bg-cover bg-center bg-no-repeat bg-primary">
                <Navbar />
                <Hero />
            </div>
            <About />
            <Experience />
            <Tech />
            <Works />
            <Contact />

        </div>
    )
}

export default Home