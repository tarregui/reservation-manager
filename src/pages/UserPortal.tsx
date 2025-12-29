import ReservationWizard from "../components/ReservationWizard";

export default function Home() {
    return(
        <section className="flex justify-center items-center w-screen h-screen bg-[#f7f7f7]">
            <div className="bg-white px-10 py-20 rounded-xl w-[800px] flex flex-col justify-around items-center">
                <div>
                    <ReservationWizard/>
                </div>
            </div>
        </section>
    );
}