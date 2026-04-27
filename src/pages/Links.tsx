import { useEffect, useState } from "react";
import { getAllClassLinks } from "@api/classApi";
import { useUserData } from "@/main";
import { currentUserHasScope } from "@utils/scopeUtils";
import FormbarHeader from "@components/FormbarHeader";
import { Typography } from "antd";
const { Title, Link } = Typography;

export default function Links() {
	const { userData } = useUserData();

	const [classLinks, setClassLinks] = useState<any[]>([]);

	const canSeeLinks = currentUserHasScope(userData, "class.links.read");

	useEffect(() => {
		if(!userData || !userData?.activeClass || !canSeeLinks) return;

		console.log(
			`Fetching links for class: ${userData.activeClass}`
		)

		getAllClassLinks(userData.activeClass).then((links) => {
			setClassLinks(links);
			console.log(links);
			// for (const link of response.data.links) {
			// 	getFaviconForLink(link).then((favicon) => {
			// 		link.favicon = favicon;
			// 	});
			// }
		});
	}, [userData, canSeeLinks]);

	return (
		<>
			<FormbarHeader />
			<Title>Links</Title>
			{
				classLinks.length > 0 && canSeeLinks ? (
					<ul>
						{classLinks.map((link, index) => (
							<li key={index}>
								<Link href={link.url} target="_blank" rel="noopener noreferrer">
									{link.name}
								</Link>
							</li>
						))}
					</ul>
				) : (
					<p>No links available.</p>
				)
			}
		</>
	);
}

// No Worky :(

// function getFaviconForLink(link: any): Promise<string> {
//     const iconSize = 32;
//     const domain = new URL(link.url).hostname;
//     // Use cors-anywhere or allorigins as a proxy
//     const apiLink = `https://cors-anywhere.herokuapp.com/https://www.google.com/s2/favicons?domain=${domain}&sz=${iconSize}`

//     const promise = fetch(apiLink)
//         .then((response) => response.blob())
//         .then((blob) => {
//             return URL.createObjectURL(blob);
//         })
//         .catch(() => "/favicon.ico");
//     return promise;
// }
